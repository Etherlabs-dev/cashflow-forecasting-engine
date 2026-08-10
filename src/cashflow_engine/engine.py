from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from .errors import CurrencyConversionError, DuplicateEventError, MissingDataError, StaleDataError
from .models import (
    CashEvent,
    DailyActual,
    ForecastAssumptions,
    ForecastPoint,
    ForecastRun,
    ScenarioAdjustments,
)
from .recurrence import occurrences
from .serialization import assumptions_snapshot, fingerprint, scenario_snapshot

MONEY = Decimal("0.01")


def build_forecast(
    *,
    company_id: str,
    actuals: list[DailyActual],
    cash_events: list[CashEvent],
    assumptions: ForecastAssumptions,
    scenario: ScenarioAdjustments | None = None,
    created_at: datetime | None = None,
) -> ForecastRun:
    if not company_id:
        raise ValueError("company_id is required")
    relevant_actuals = sorted(
        (item for item in actuals if item.company_id == company_id),
        key=lambda item: item.actual_date,
    )
    if not relevant_actuals:
        raise MissingDataError("at least one daily actual is required")
    latest_actual = relevant_actuals[-1]
    if latest_actual.actual_date > assumptions.as_of_date:
        raise ValueError("actual data cannot be later than forecast as_of_date")
    _validate_currency(latest_actual.currency, assumptions)

    unique_events = _deduplicate_events(cash_events, company_id)
    lookback_start = assumptions.as_of_date - timedelta(days=assumptions.lookback_days - 1)
    historical_events = [
        event
        for event in unique_events
        if lookback_start <= event.event_date <= assumptions.as_of_date
    ]
    if not historical_events:
        raise MissingDataError("no cash events exist in the configured lookback window")

    event_watermark = max(event.source_updated_at for event in historical_events)
    source_watermark = max(latest_actual.source_updated_at, event_watermark)
    as_of_end = datetime.combine(assumptions.as_of_date, time.max, tzinfo=UTC)
    if latest_actual.source_updated_at > as_of_end or event_watermark > as_of_end:
        raise ValueError("source_updated_at cannot be later than forecast as_of_date")
    max_age = timedelta(days=assumptions.max_source_age_days)
    if (
        as_of_end - latest_actual.source_updated_at > max_age
        or as_of_end - event_watermark > max_age
    ):
        raise StaleDataError("critical forecast inputs exceed max_source_age_days")

    historical_inflows = sum(
        (
            _convert(event.amount, event.currency, assumptions)
            for event in historical_events
            if event.amount > 0
        ),
        Decimal("0"),
    )
    historical_outflows = sum(
        (
            -_convert(event.amount, event.currency, assumptions)
            for event in historical_events
            if event.amount < 0
        ),
        Decimal("0"),
    )
    average_inflow = historical_inflows / assumptions.lookback_days
    average_outflow = historical_outflows / assumptions.lookback_days

    scenario_inflow = scenario.inflow_multiplier if scenario else Decimal("1")
    scenario_outflow = scenario.outflow_multiplier if scenario else Decimal("1")
    future_events = _future_events(unique_events, assumptions)
    recurring = assumptions.recurring_events + (
        scenario.additional_recurring_events if scenario else ()
    )
    recurring_by_date = _recurring_by_date(recurring, assumptions)

    base_balance = assumptions.opening_balance
    best_balance = assumptions.opening_balance
    worst_balance = assumptions.opening_balance
    points: list[ForecastPoint] = []
    for day_number in range(1, assumptions.horizon_days + 1):
        forecast_date = assumptions.as_of_date + timedelta(days=day_number)
        growth = max(
            Decimal("0"),
            Decimal("1") + assumptions.monthly_growth_rate * Decimal(day_number) / Decimal("30"),
        )
        inflows = average_inflow * growth * scenario_inflow
        outflows = average_outflow * growth * scenario_outflow
        for amount in future_events.get(forecast_date, ()):  # known one-off events
            if amount > 0:
                inflows += amount
            else:
                outflows -= amount
        for amount in recurring_by_date.get(forecast_date, ()):  # scheduled events
            if amount > 0:
                inflows += amount
            else:
                outflows -= amount

        base_net = inflows - outflows
        best_net = inflows * assumptions.best_inflow_multiplier - (
            outflows * assumptions.best_outflow_multiplier
        )
        worst_net = inflows * assumptions.worst_inflow_multiplier - (
            outflows * assumptions.worst_outflow_multiplier
        )
        base_balance += base_net
        best_balance += best_net
        worst_balance += worst_net
        points.append(
            ForecastPoint(
                forecast_date=forecast_date,
                base_inflows=_money(inflows),
                base_outflows=_money(outflows),
                base_net_cash=_money(base_net),
                base_closing_balance=_money(base_balance),
                best_inflows=_money(inflows * assumptions.best_inflow_multiplier),
                best_outflows=_money(outflows * assumptions.best_outflow_multiplier),
                best_net_cash=_money(best_net),
                best_closing_balance=_money(best_balance),
                worst_inflows=_money(inflows * assumptions.worst_inflow_multiplier),
                worst_outflows=_money(outflows * assumptions.worst_outflow_multiplier),
                worst_net_cash=_money(worst_net),
                worst_closing_balance=_money(worst_balance),
            )
        )

    snapshot = assumptions_snapshot(assumptions)
    scenario_data = scenario_snapshot(scenario)
    input_identity = {
        "company_id": company_id,
        "assumptions": snapshot,
        "scenario": scenario_data,
        "event_ids": [event.event_id for event in unique_events],
        "source_watermark": source_watermark.isoformat(),
    }
    run_id = str(uuid.uuid5(uuid.NAMESPACE_URL, fingerprint(input_identity)))
    return ForecastRun(
        run_id=run_id,
        company_id=company_id,
        scenario_id=scenario.scenario_id if scenario else None,
        as_of_date=assumptions.as_of_date,
        created_at=created_at or datetime.now(UTC),
        source_watermark=source_watermark,
        assumptions_fingerprint=fingerprint(snapshot),
        assumptions_snapshot=snapshot,
        scenario_snapshot=scenario_data,
        points=tuple(points),
    )


def runway_days(run: ForecastRun, threshold: Decimal, *, track: str = "base") -> int | None:
    attribute = f"{track}_closing_balance"
    if track not in {"base", "best", "worst"}:
        raise ValueError("track must be base, best, or worst")
    threshold = Decimal(threshold)
    for index, point in enumerate(run.points, start=1):
        if getattr(point, attribute) <= threshold:
            return index
    return None


def _deduplicate_events(events: list[CashEvent], company_id: str) -> tuple[CashEvent, ...]:
    unique: dict[str, CashEvent] = {}
    for event in events:
        if event.company_id != company_id:
            continue
        existing = unique.get(event.event_id)
        if existing and existing != event:
            raise DuplicateEventError(f"conflicting duplicate event: {event.event_id}")
        unique[event.event_id] = event
    return tuple(sorted(unique.values(), key=lambda event: (event.event_date, event.event_id)))


def _future_events(
    events: tuple[CashEvent, ...], assumptions: ForecastAssumptions
) -> dict[date, tuple[Decimal, ...]]:
    end = assumptions.as_of_date + timedelta(days=assumptions.horizon_days)
    result: dict[date, list[Decimal]] = {}
    for event in events:
        if assumptions.as_of_date < event.event_date <= end:
            result.setdefault(event.event_date, []).append(
                _convert(event.amount, event.currency, assumptions)
            )
    return {key: tuple(value) for key, value in result.items()}


def _recurring_by_date(
    events: tuple, assumptions: ForecastAssumptions
) -> dict[date, tuple[Decimal, ...]]:
    start = assumptions.as_of_date + timedelta(days=1)
    end = assumptions.as_of_date + timedelta(days=assumptions.horizon_days)
    result: dict[date, list[Decimal]] = {}
    seen: set[tuple[str, date]] = set()
    for event in events:
        for event_date in occurrences(event, start, end):
            key = (event.event_id, event_date)
            if key in seen:
                continue
            seen.add(key)
            result.setdefault(event_date, []).append(
                _convert(event.amount, event.currency, assumptions)
            )
    return {key: tuple(value) for key, value in result.items()}


def _validate_currency(currency: str, assumptions: ForecastAssumptions) -> None:
    if currency != assumptions.reporting_currency and currency not in dict(assumptions.fx_rates):
        raise CurrencyConversionError(
            f"missing frozen FX rate for {currency}/{assumptions.reporting_currency}"
        )


def _convert(amount: Decimal, currency: str, assumptions: ForecastAssumptions) -> Decimal:
    if currency == assumptions.reporting_currency:
        return amount
    rates = dict(assumptions.fx_rates)
    try:
        return amount * rates[currency]
    except KeyError as exc:
        raise CurrencyConversionError(
            f"missing frozen FX rate for {currency}/{assumptions.reporting_currency}"
        ) from exc


def _money(value: Decimal) -> Decimal:
    return value.quantize(MONEY)
