from __future__ import annotations

import hashlib
import json
from datetime import date, datetime
from decimal import Decimal

from .models import ForecastAssumptions, RecurringCashEvent, ScenarioAdjustments


def assumptions_snapshot(assumptions: ForecastAssumptions) -> dict[str, object]:
    return {
        "as_of_date": assumptions.as_of_date.isoformat(),
        "horizon_days": assumptions.horizon_days,
        "lookback_days": assumptions.lookback_days,
        "opening_balance": str(assumptions.opening_balance),
        "reporting_currency": assumptions.reporting_currency,
        "monthly_growth_rate": str(assumptions.monthly_growth_rate),
        "best_inflow_multiplier": str(assumptions.best_inflow_multiplier),
        "best_outflow_multiplier": str(assumptions.best_outflow_multiplier),
        "worst_inflow_multiplier": str(assumptions.worst_inflow_multiplier),
        "worst_outflow_multiplier": str(assumptions.worst_outflow_multiplier),
        "runway_threshold": str(assumptions.runway_threshold),
        "max_source_age_days": assumptions.max_source_age_days,
        "fx_rates": {currency: str(rate) for currency, rate in assumptions.fx_rates},
        "recurring_events": [_recurring_snapshot(event) for event in assumptions.recurring_events],
        "model_version": assumptions.model_version,
    }


def scenario_snapshot(scenario: ScenarioAdjustments | None) -> dict[str, object] | None:
    if scenario is None:
        return None
    return {
        "scenario_id": scenario.scenario_id,
        "name": scenario.name,
        "inflow_multiplier": str(scenario.inflow_multiplier),
        "outflow_multiplier": str(scenario.outflow_multiplier),
        "additional_recurring_events": [
            _recurring_snapshot(event) for event in scenario.additional_recurring_events
        ],
    }


def fingerprint(snapshot: dict[str, object]) -> str:
    encoded = json.dumps(snapshot, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def json_default(value: object) -> str:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    raise TypeError(f"cannot serialize {type(value).__name__}")


def _recurring_snapshot(event: RecurringCashEvent) -> dict[str, object]:
    return {
        "event_id": event.event_id,
        "start_date": event.start_date.isoformat(),
        "amount": str(event.amount),
        "currency": event.currency,
        "frequency": event.frequency.value,
        "interval_count": event.interval_count,
        "end_date": event.end_date.isoformat() if event.end_date else None,
        "day_of_month": event.day_of_month,
    }
