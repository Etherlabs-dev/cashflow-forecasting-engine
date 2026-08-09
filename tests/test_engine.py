from dataclasses import replace
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from conftest import AS_OF, COMPANY, FRESH

from cashflow_engine.engine import build_forecast, runway_days
from cashflow_engine.errors import (
    CurrencyConversionError,
    DuplicateEventError,
    MissingDataError,
    StaleDataError,
)
from cashflow_engine.models import (
    CashEvent,
    ForecastAssumptions,
    Frequency,
    RecurringCashEvent,
    ScenarioAdjustments,
)
from cashflow_engine.persistence import forecast_run_record


def test_forecast_is_deterministic_and_freezes_every_assumption(actuals, cash_events, assumptions):
    first = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=cash_events,
        assumptions=assumptions,
        created_at=FRESH,
    )
    second = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=cash_events,
        assumptions=assumptions,
        created_at=FRESH,
    )
    assert first == second
    assert first.as_of_date == AS_OF
    assert first.points[0].forecast_date == date(2025, 2, 1)
    assert first.points[-1].forecast_date == date(2025, 3, 2)
    record = forecast_run_record(first)
    assert record["as_of_date"] == "2025-01-31"
    assert record["assumptions"]["opening_balance"] == "1000"
    assert len(record["assumptions_fingerprint"]) == 64


def test_recurring_events_are_applied_on_exact_forecast_dates(actuals, cash_events, assumptions):
    rent = RecurringCashEvent("rent", date(2025, 1, 31), Decimal("-300"), "USD", Frequency.MONTHLY)
    run = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=cash_events,
        assumptions=replace(assumptions, recurring_events=(rent,)),
    )
    february_28 = next(point for point in run.points if point.forecast_date == date(2025, 2, 28))
    february_27 = next(point for point in run.points if point.forecast_date == date(2025, 2, 27))
    assert february_28.base_outflows - february_27.base_outflows == Decimal("300.00")


def test_missing_and_stale_critical_data_fail_closed(actuals, cash_events, assumptions):
    with pytest.raises(MissingDataError, match="daily actual"):
        build_forecast(
            company_id=COMPANY,
            actuals=[],
            cash_events=cash_events,
            assumptions=assumptions,
        )
    with pytest.raises(MissingDataError, match="lookback"):
        build_forecast(
            company_id=COMPANY,
            actuals=actuals,
            cash_events=[],
            assumptions=assumptions,
        )
    stale_actual = replace(actuals[0], source_updated_at=datetime(2025, 1, 1, tzinfo=UTC))
    with pytest.raises(StaleDataError):
        build_forecast(
            company_id=COMPANY,
            actuals=[stale_actual],
            cash_events=cash_events,
            assumptions=assumptions,
        )


def test_exact_duplicates_are_collapsed_and_conflicts_rejected(actuals, cash_events, assumptions):
    clean = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=cash_events,
        assumptions=assumptions,
    )
    replayed = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=[*cash_events, cash_events[0]],
        assumptions=assumptions,
    )
    assert replayed.run_id == clean.run_id
    assert replayed.points == clean.points
    conflict = replace(cash_events[0], amount=Decimal("999"))
    with pytest.raises(DuplicateEventError):
        build_forecast(
            company_id=COMPANY,
            actuals=actuals,
            cash_events=[*cash_events, conflict],
            assumptions=assumptions,
        )


def test_scenario_run_does_not_mutate_baseline(actuals, cash_events, assumptions):
    baseline = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=cash_events,
        assumptions=assumptions,
    )
    scenario = ScenarioAdjustments("scenario-hiring", "Hiring", outflow_multiplier=Decimal("2"))
    scenario_run = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=cash_events,
        assumptions=assumptions,
        scenario=scenario,
    )
    baseline_again = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=cash_events,
        assumptions=assumptions,
    )
    assert baseline_again.run_id == baseline.run_id
    assert baseline_again.points == baseline.points
    assert baseline_again.assumptions_snapshot == baseline.assumptions_snapshot
    assert scenario_run.scenario_id == "scenario-hiring"
    assert scenario_run.points != baseline.points
    assert baseline.scenario_snapshot is None


def test_currency_requires_frozen_fx_rate(actuals, cash_events, assumptions):
    euro_event = CashEvent("eur", COMPANY, date(2025, 1, 30), Decimal("100"), "EUR", FRESH)
    with pytest.raises(CurrencyConversionError):
        build_forecast(
            company_id=COMPANY,
            actuals=actuals,
            cash_events=[*cash_events, euro_event],
            assumptions=assumptions,
        )
    converted = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=[*cash_events, euro_event],
        assumptions=replace(assumptions, fx_rates=(("EUR", Decimal("1.20")),)),
    )
    assert converted.assumptions_snapshot["fx_rates"] == {"EUR": "1.20"}


def test_runway_threshold_uses_first_inclusive_crossing(actuals, cash_events, assumptions):
    negative_history = [replace(cash_events[0], amount=Decimal("-310")), cash_events[1]]
    run = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=negative_history,
        assumptions=replace(assumptions, opening_balance=Decimal("20")),
    )
    assert runway_days(run, Decimal("0")) == 2
    assert runway_days(run, Decimal("-10000")) is None
    with pytest.raises(ValueError, match="track"):
        runway_days(run, Decimal("0"), track="invalid")


@pytest.mark.parametrize(
    "factory",
    [
        lambda: ForecastAssumptions(AS_OF, 0, 30, Decimal("1"), "USD"),
        lambda: ForecastAssumptions(AS_OF, 30, 0, Decimal("1"), "USD"),
        lambda: ForecastAssumptions(AS_OF, 30, 30, Decimal("NaN"), "USD"),
        lambda: ForecastAssumptions(AS_OF, 30, 30, Decimal("1"), "US"),
        lambda: CashEvent("zero", COMPANY, AS_OF, Decimal("0"), "USD", FRESH),
    ],
)
def test_invalid_values_are_rejected(factory):
    with pytest.raises(ValueError):
        factory()
