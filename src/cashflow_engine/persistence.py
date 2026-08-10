from __future__ import annotations

from .models import ForecastRun


def forecast_run_record(run: ForecastRun) -> dict[str, object]:
    """Return the immutable run row; assumptions and as-of date are never inferred later."""

    return {
        "id": run.run_id,
        "company_id": run.company_id,
        "scenario_id": run.scenario_id,
        "run_label": run.scenario_snapshot.get("name", "scenario")
        if run.scenario_snapshot
        else "baseline",
        "as_of_date": run.as_of_date.isoformat(),
        "run_at": run.created_at.isoformat(),
        "source_watermark": run.source_watermark.isoformat(),
        "assumptions": dict(run.assumptions_snapshot),
        "assumptions_fingerprint": run.assumptions_fingerprint,
        "scenario_snapshot": dict(run.scenario_snapshot) if run.scenario_snapshot else {},
        "model_version": run.assumptions_snapshot["model_version"],
        "input_status": "ready",
    }


def daily_forecast_records(run: ForecastRun) -> list[dict[str, object]]:
    return [
        {
            "run_id": run.run_id,
            "company_id": run.company_id,
            "date": point.forecast_date.isoformat(),
            "base_inflows": point.base_inflows,
            "base_outflows": point.base_outflows,
            "base_net_cash": point.base_net_cash,
            "base_closing_balance": point.base_closing_balance,
            "best_inflows": point.best_inflows,
            "best_outflows": point.best_outflows,
            "best_net_cash": point.best_net_cash,
            "best_closing_balance": point.best_closing_balance,
            "worst_inflows": point.worst_inflows,
            "worst_outflows": point.worst_outflows,
            "worst_net_cash": point.worst_net_cash,
            "worst_closing_balance": point.worst_closing_balance,
            "metadata": {},
        }
        for point in run.points
    ]
