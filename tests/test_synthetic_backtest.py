from scripts.run_synthetic_backtest import build_synthetic_report


def test_synthetic_backtest_report_is_deterministic_and_evidence_labeled():
    first = build_synthetic_report()
    second = build_synthetic_report()
    assert first == second
    assert first["evidence_label"] == "synthetic_backtest"
    assert first["aggregate"]["evaluated_points"] == 21
    assert "does not establish forecast accuracy" in first["claim_boundary"]
