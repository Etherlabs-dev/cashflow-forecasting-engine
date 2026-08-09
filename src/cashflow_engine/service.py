from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, ConfigDict, Field

from .engine import build_forecast
from .errors import ForecastError
from .models import (
    CashEvent,
    DailyActual,
    ForecastAssumptions,
    Frequency,
    RecurringCashEvent,
    ScenarioAdjustments,
)
from .persistence import daily_forecast_records, forecast_run_record

app = FastAPI(title="Cashflow Forecast Engine", version="0.1.0")


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ActualInput(StrictModel):
    company_id: str
    actual_date: date
    closing_balance: Decimal
    currency: str
    source_updated_at: datetime


class CashEventInput(StrictModel):
    event_id: str
    company_id: str
    event_date: date
    amount: Decimal
    currency: str
    source_updated_at: datetime


class RecurringInput(StrictModel):
    event_id: str
    start_date: date
    amount: Decimal
    currency: str
    frequency: Frequency
    interval_count: int = Field(default=1, ge=1)
    end_date: date | None = None
    day_of_month: int | None = Field(default=None, ge=1, le=31)


class AssumptionsInput(StrictModel):
    as_of_date: date
    horizon_days: int = Field(ge=1, le=366)
    lookback_days: int = Field(ge=1)
    opening_balance: Decimal
    reporting_currency: str
    monthly_growth_rate: Decimal = Decimal("0")
    best_inflow_multiplier: Decimal = Decimal("1.10")
    best_outflow_multiplier: Decimal = Decimal("0.95")
    worst_inflow_multiplier: Decimal = Decimal("0.80")
    worst_outflow_multiplier: Decimal = Decimal("1.10")
    runway_threshold: Decimal = Decimal("0")
    max_source_age_days: int = Field(default=2, ge=0)
    fx_rates: dict[str, Decimal] = Field(default_factory=dict)
    recurring_events: list[RecurringInput] = Field(default_factory=list)
    model_version: str = "deterministic-v1"


class ScenarioInput(StrictModel):
    scenario_id: str
    name: str
    inflow_multiplier: Decimal = Field(default=Decimal("1"), ge=0)
    outflow_multiplier: Decimal = Field(default=Decimal("1"), ge=0)
    additional_recurring_events: list[RecurringInput] = Field(default_factory=list)


class ForecastRequest(StrictModel):
    company_id: str
    actuals: list[ActualInput]
    cash_events: list[CashEventInput]
    assumptions: AssumptionsInput
    scenario: ScenarioInput | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model_version": "deterministic-v1"}


@app.post("/v1/forecast")
def forecast(request: ForecastRequest) -> dict[str, object]:
    try:
        run = build_forecast(
            company_id=request.company_id,
            actuals=[DailyActual(**item.model_dump()) for item in request.actuals],
            cash_events=[CashEvent(**item.model_dump()) for item in request.cash_events],
            assumptions=_assumptions(request.assumptions),
            scenario=_scenario(request.scenario),
        )
    except (ForecastError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return jsonable_encoder(
        {"run": forecast_run_record(run), "daily_forecasts": daily_forecast_records(run)}
    )


def _recurring(item: RecurringInput) -> RecurringCashEvent:
    return RecurringCashEvent(**item.model_dump())


def _assumptions(item: AssumptionsInput) -> ForecastAssumptions:
    values = item.model_dump(exclude={"fx_rates", "recurring_events"})
    return ForecastAssumptions(
        **values,
        fx_rates=tuple(item.fx_rates.items()),
        recurring_events=tuple(_recurring(event) for event in item.recurring_events),
    )


def _scenario(item: ScenarioInput | None) -> ScenarioAdjustments | None:
    if item is None:
        return None
    values = item.model_dump(exclude={"additional_recurring_events"})
    return ScenarioAdjustments(
        **values,
        additional_recurring_events=tuple(
            _recurring(event) for event in item.additional_recurring_events
        ),
    )
