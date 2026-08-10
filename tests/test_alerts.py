from dataclasses import replace
from decimal import Decimal

from conftest import COMPANY

from cashflow_engine.alerts import AlertLedger
from cashflow_engine.engine import build_forecast


def test_alerts_deduplicate_until_recovery(actuals, cash_events, assumptions):
    run = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=cash_events,
        assumptions=assumptions,
    )
    unsafe_points = tuple(
        replace(point, base_closing_balance=Decimal("-1") if index == 2 else Decimal("10"))
        for index, point in enumerate(run.points, start=1)
    )
    unsafe = replace(run, points=unsafe_points)
    ledger = AlertLedger()
    first = ledger.evaluate(unsafe, threshold=Decimal("0"), warning_days=10)
    assert first is not None and first.runway_days == 2
    assert ledger.evaluate(unsafe, threshold=Decimal("0"), warning_days=10) is None
    assert ledger.active_count() == 1

    healthy_points = tuple(
        replace(
            point,
            base_closing_balance=Decimal("100"),
            best_closing_balance=Decimal("100"),
            worst_closing_balance=Decimal("100"),
        )
        for point in run.points
    )
    ledger.evaluate(replace(run, points=healthy_points), threshold=Decimal("0"), warning_days=10)
    assert ledger.active_count() == 0
    assert ledger.evaluate(unsafe, threshold=Decimal("0"), warning_days=10) is not None


def test_scenario_alert_key_is_isolated_from_baseline(actuals, cash_events, assumptions):
    run = build_forecast(
        company_id=COMPANY,
        actuals=actuals,
        cash_events=cash_events,
        assumptions=assumptions,
    )
    points = tuple(replace(point, base_closing_balance=Decimal("-1")) for point in run.points)
    baseline = replace(run, points=points)
    scenario = replace(run, run_id="scenario-run", scenario_id="scenario-1", points=points)
    ledger = AlertLedger()
    assert ledger.evaluate(baseline, threshold=Decimal("0"), warning_days=5)
    assert ledger.evaluate(scenario, threshold=Decimal("0"), warning_days=5)
    assert ledger.active_count() == 2
