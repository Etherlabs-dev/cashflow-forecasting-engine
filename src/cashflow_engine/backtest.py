from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from .errors import MissingDataError
from .models import DailyActual, ForecastRun

MONEY = Decimal("0.01")


@dataclass(frozen=True, slots=True)
class BacktestResult:
    forecast_run_id: str
    forecast_as_of_date: str
    assumptions_fingerprint: str
    evaluated_points: int
    expected_points: int
    coverage_ratio: Decimal
    mean_absolute_error: Decimal
    weighted_absolute_percentage_error: Decimal | None
    mean_error: Decimal
    evidence_label: str = "synthetic_backtest"


def backtest(run: ForecastRun, realized: list[DailyActual]) -> BacktestResult:
    realized_by_date = {
        item.actual_date: item
        for item in realized
        if item.company_id == run.company_id and item.actual_date > run.as_of_date
    }
    pairs = [
        (point.base_closing_balance, realized_by_date[point.forecast_date].closing_balance)
        for point in run.points
        if point.forecast_date in realized_by_date
    ]
    if not pairs:
        raise MissingDataError("no realized dates overlap this frozen forecast")
    absolute_errors = [abs(forecast - actual) for forecast, actual in pairs]
    signed_errors = [forecast - actual for forecast, actual in pairs]
    actual_total = sum((abs(actual) for _, actual in pairs), Decimal("0"))
    mae = sum(absolute_errors, Decimal("0")) / len(pairs)
    mean_error = sum(signed_errors, Decimal("0")) / len(pairs)
    wape = sum(absolute_errors, Decimal("0")) / actual_total if actual_total != 0 else None
    return BacktestResult(
        forecast_run_id=run.run_id,
        forecast_as_of_date=run.as_of_date.isoformat(),
        assumptions_fingerprint=run.assumptions_fingerprint,
        evaluated_points=len(pairs),
        expected_points=len(run.points),
        coverage_ratio=(Decimal(len(pairs)) / len(run.points)).quantize(Decimal("0.0001")),
        mean_absolute_error=mae.quantize(MONEY),
        weighted_absolute_percentage_error=(
            wape.quantize(Decimal("0.0001")) if wape is not None else None
        ),
        mean_error=mean_error.quantize(MONEY),
    )
