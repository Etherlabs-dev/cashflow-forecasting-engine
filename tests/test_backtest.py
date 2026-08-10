from datetime import date
from decimal import Decimal

import pytest
from conftest import COMPANY, FRESH

from cashflow_engine.backtest import backtest
from cashflow_engine.engine import build_forecast
from cashflow_engine.errors import MissingDataError
from cashflow_engine.models import DailyActual


def test_backtest_compares_frozen_forecast_to_later_realized_cash(
    actuals, cash_events, assumptions
):
    run = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=cash_events,
        assumptions=assumptions,
        created_at=FRESH,
    )
    realized = [
        DailyActual(
            COMPANY,
            point.forecast_date,
            point.base_closing_balance + Decimal("10"),
            "USD",
            FRESH,
        )
        for point in run.points[:7]
    ]
    result = backtest(run, realized)
    assert result.forecast_as_of_date == "2025-01-31"
    assert result.evaluated_points == 7
    assert result.expected_points == 30
    assert result.coverage_ratio == Decimal("0.2333")
    assert result.mean_absolute_error == Decimal("10.00")
    assert result.mean_error == Decimal("-10.00")
    assert result.evidence_label == "synthetic_backtest"


def test_backtest_rejects_no_overlap(actuals, cash_events, assumptions):
    run = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=cash_events,
        assumptions=assumptions,
    )
    unrelated = [DailyActual(COMPANY, date(2024, 1, 1), Decimal("1"), "USD", FRESH)]
    with pytest.raises(MissingDataError, match="overlap"):
        backtest(run, unrelated)
