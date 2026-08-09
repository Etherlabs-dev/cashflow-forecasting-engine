from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from .engine import runway_days
from .models import ForecastRun


@dataclass(frozen=True, slots=True)
class AlertCandidate:
    company_id: str
    scenario_id: str | None
    alert_type: str
    threshold: Decimal
    runway_days: int
    forecast_run_id: str

    @property
    def dedupe_key(self) -> str:
        scenario = self.scenario_id or "baseline"
        return f"{self.company_id}:{scenario}:{self.alert_type}:{self.threshold}"


class AlertLedger:
    """Reference alert state that suppresses repeated active threshold alerts."""

    def __init__(self) -> None:
        self._active: dict[str, AlertCandidate] = {}

    def evaluate(
        self, run: ForecastRun, *, threshold: Decimal, warning_days: int
    ) -> AlertCandidate | None:
        days = runway_days(run, threshold, track="base")
        key = f"{run.company_id}:{run.scenario_id or 'baseline'}:runway:{threshold}"
        if days is None or days >= warning_days:
            self._active.pop(key, None)
            return None
        candidate = AlertCandidate(
            company_id=run.company_id,
            scenario_id=run.scenario_id,
            alert_type="runway",
            threshold=threshold,
            runway_days=days,
            forecast_run_id=run.run_id,
        )
        if key in self._active:
            return None
        self._active[key] = candidate
        return candidate

    def active_count(self) -> int:
        return len(self._active)
