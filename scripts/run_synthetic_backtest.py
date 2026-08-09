from __future__ import annotations

import json
import platform
from dataclasses import asdict
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

from cashflow_engine.backtest import backtest
from cashflow_engine.engine import build_forecast
from cashflow_engine.models import CashEvent, DailyActual, ForecastAssumptions
from cashflow_engine.serialization import json_default

COMPANY = "synthetic-company"
DEVIATIONS = (
    Decimal("5"),
    Decimal("-3"),
    Decimal("8"),
    Decimal("0"),
    Decimal("-4"),
    Decimal("2"),
    Decimal("6"),
)


def build_synthetic_report() -> dict[str, object]:
    windows = []
    for as_of in (date(2025, 1, 31), date(2025, 2, 28), date(2025, 3, 31)):
        updated_at = datetime.combine(as_of, datetime.min.time(), tzinfo=UTC) + timedelta(hours=12)
        assumptions = ForecastAssumptions(
            as_of_date=as_of,
            horizon_days=7,
            lookback_days=28,
            opening_balance=Decimal("1000"),
            reporting_currency="USD",
            max_source_age_days=1,
        )
        events = [
            CashEvent(
                f"{as_of}-in",
                COMPANY,
                as_of - timedelta(days=14),
                Decimal("280"),
                "USD",
                updated_at,
            ),
            CashEvent(
                f"{as_of}-out",
                COMPANY,
                as_of - timedelta(days=7),
                Decimal("-140"),
                "USD",
                updated_at,
            ),
        ]
        actual = DailyActual(COMPANY, as_of, Decimal("1000"), "USD", updated_at)
        run = build_forecast(
            company_id=COMPANY,
            actuals=[actual],
            cash_events=events,
            assumptions=assumptions,
            created_at=updated_at,
        )
        realized = [
            DailyActual(
                COMPANY,
                point.forecast_date,
                point.base_closing_balance + DEVIATIONS[index],
                "USD",
                updated_at,
            )
            for index, point in enumerate(run.points)
        ]
        windows.append(asdict(backtest(run, realized)))

    mean_mae = sum((item["mean_absolute_error"] for item in windows), Decimal("0")) / len(windows)
    return {
        "evidence_label": "synthetic_backtest",
        "generated_from": "deterministic fixtures; no production or client data",
        "assumptions": {
            "windows": 3,
            "horizon_days": 7,
            "opening_balance": "1000 USD",
            "realized_deviations_usd": [str(value) for value in DEVIATIONS],
        },
        "environment": {"python": platform.python_version(), "model_version": "deterministic-v1"},
        "aggregate": {
            "evaluated_points": sum(item["evaluated_points"] for item in windows),
            "mean_window_mae": mean_mae.quantize(Decimal("0.01")),
        },
        "windows": windows,
        "claim_boundary": (
            "Demonstrates backtest mechanics only; it does not establish forecast accuracy."
        ),
    }


def main() -> None:
    output = Path("results/synthetic_backtest.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(build_synthetic_report(), indent=2, default=json_default) + "\n",
        encoding="utf-8",
    )
    print(output)


if __name__ == "__main__":
    main()
