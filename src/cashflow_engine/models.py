from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum


def _decimal(value: Decimal | int | str) -> Decimal:
    result = Decimal(value)
    if not result.is_finite():
        raise ValueError("financial values must be finite")
    return result


def _currency(value: str) -> str:
    result = value.upper()
    if len(result) != 3 or not result.isalpha():
        raise ValueError("currency must be a three-letter ISO code")
    return result


class Frequency(StrEnum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


@dataclass(frozen=True, slots=True)
class CashEvent:
    event_id: str
    company_id: str
    event_date: date
    amount: Decimal
    currency: str
    source_updated_at: datetime

    def __post_init__(self) -> None:
        if not self.event_id or not self.company_id:
            raise ValueError("event_id and company_id are required")
        amount = _decimal(self.amount)
        if amount == 0:
            raise ValueError("cash event amount cannot be zero")
        if self.source_updated_at.tzinfo is None:
            raise ValueError("source_updated_at must be timezone-aware")
        object.__setattr__(self, "amount", amount)
        object.__setattr__(self, "currency", _currency(self.currency))


@dataclass(frozen=True, slots=True)
class DailyActual:
    company_id: str
    actual_date: date
    closing_balance: Decimal
    currency: str
    source_updated_at: datetime

    def __post_init__(self) -> None:
        if self.source_updated_at.tzinfo is None:
            raise ValueError("source_updated_at must be timezone-aware")
        object.__setattr__(self, "closing_balance", _decimal(self.closing_balance))
        object.__setattr__(self, "currency", _currency(self.currency))


@dataclass(frozen=True, slots=True)
class RecurringCashEvent:
    event_id: str
    start_date: date
    amount: Decimal
    currency: str
    frequency: Frequency
    interval_count: int = 1
    end_date: date | None = None
    day_of_month: int | None = None

    def __post_init__(self) -> None:
        amount = _decimal(self.amount)
        if amount == 0:
            raise ValueError("recurring amount cannot be zero")
        if self.interval_count < 1:
            raise ValueError("interval_count must be positive")
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot precede start_date")
        if self.day_of_month is not None and not 1 <= self.day_of_month <= 31:
            raise ValueError("day_of_month must be between 1 and 31")
        object.__setattr__(self, "amount", amount)
        object.__setattr__(self, "currency", _currency(self.currency))


@dataclass(frozen=True, slots=True)
class ForecastAssumptions:
    as_of_date: date
    horizon_days: int
    lookback_days: int
    opening_balance: Decimal
    reporting_currency: str
    monthly_growth_rate: Decimal = Decimal("0")
    best_inflow_multiplier: Decimal = Decimal("1.10")
    best_outflow_multiplier: Decimal = Decimal("0.95")
    worst_inflow_multiplier: Decimal = Decimal("0.80")
    worst_outflow_multiplier: Decimal = Decimal("1.10")
    runway_threshold: Decimal = Decimal("0")
    max_source_age_days: int = 2
    fx_rates: tuple[tuple[str, Decimal], ...] = ()
    recurring_events: tuple[RecurringCashEvent, ...] = ()
    model_version: str = "deterministic-v1"

    def __post_init__(self) -> None:
        if not 1 <= self.horizon_days <= 366:
            raise ValueError("horizon_days must be between 1 and 366")
        if self.lookback_days < 1:
            raise ValueError("lookback_days must be positive")
        if self.max_source_age_days < 0:
            raise ValueError("max_source_age_days cannot be negative")
        object.__setattr__(self, "opening_balance", _decimal(self.opening_balance))
        object.__setattr__(self, "monthly_growth_rate", _decimal(self.monthly_growth_rate))
        object.__setattr__(self, "runway_threshold", _decimal(self.runway_threshold))
        if self.monthly_growth_rate <= Decimal("-1"):
            raise ValueError("monthly_growth_rate must be greater than -1")
        for name in (
            "best_inflow_multiplier",
            "best_outflow_multiplier",
            "worst_inflow_multiplier",
            "worst_outflow_multiplier",
        ):
            value = _decimal(getattr(self, name))
            if value < 0:
                raise ValueError(f"{name} cannot be negative")
            object.__setattr__(self, name, value)
        object.__setattr__(self, "reporting_currency", _currency(self.reporting_currency))
        normalized_rates = tuple(
            sorted((_currency(currency), _decimal(rate)) for currency, rate in self.fx_rates)
        )
        if any(rate <= 0 for _, rate in normalized_rates):
            raise ValueError("FX rates must be positive")
        if len({currency for currency, _ in normalized_rates}) != len(normalized_rates):
            raise ValueError("FX currencies must be unique")
        object.__setattr__(self, "fx_rates", normalized_rates)


@dataclass(frozen=True, slots=True)
class ScenarioAdjustments:
    scenario_id: str
    name: str
    inflow_multiplier: Decimal = Decimal("1")
    outflow_multiplier: Decimal = Decimal("1")
    additional_recurring_events: tuple[RecurringCashEvent, ...] = ()

    def __post_init__(self) -> None:
        if not self.scenario_id or not self.name:
            raise ValueError("scenario_id and name are required")
        for attr in ("inflow_multiplier", "outflow_multiplier"):
            value = _decimal(getattr(self, attr))
            if value < 0:
                raise ValueError(f"{attr} cannot be negative")
            object.__setattr__(self, attr, value)


@dataclass(frozen=True, slots=True)
class ForecastPoint:
    forecast_date: date
    base_inflows: Decimal
    base_outflows: Decimal
    base_net_cash: Decimal
    base_closing_balance: Decimal
    best_inflows: Decimal
    best_outflows: Decimal
    best_net_cash: Decimal
    best_closing_balance: Decimal
    worst_inflows: Decimal
    worst_outflows: Decimal
    worst_net_cash: Decimal
    worst_closing_balance: Decimal


@dataclass(frozen=True, slots=True)
class ForecastRun:
    run_id: str
    company_id: str
    scenario_id: str | None
    as_of_date: date
    created_at: datetime
    source_watermark: datetime
    assumptions_fingerprint: str
    assumptions_snapshot: dict[str, object]
    scenario_snapshot: dict[str, object] | None
    points: tuple[ForecastPoint, ...] = field(default_factory=tuple)
