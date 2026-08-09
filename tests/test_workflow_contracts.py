from __future__ import annotations

import json
from pathlib import Path

WORKFLOW_DIR = Path(__file__).parents[1] / "n8n"


def _workflow(name: str) -> dict[str, object]:
    return json.loads((WORKFLOW_DIR / name).read_text())


def test_all_n8n_exports_are_valid_disabled_workflows() -> None:
    paths = sorted(WORKFLOW_DIR.glob("*.json"))
    assert len(paths) == 6
    for path in paths:
        workflow = json.loads(path.read_text())
        assert workflow["active"] is False
        assert workflow["nodes"]
        assert "connections" in workflow


def test_forecast_and_scenario_delegate_math_to_service() -> None:
    for name in ("cashflow_forecast_engine.json", "cashflow_scenario_runner.json"):
        workflow = _workflow(name)
        serialized = json.dumps(workflow)
        assert "FORECAST_ENGINE_URL" in serialized
        assert "/v1/forecast" in serialized
        assert "pythonCode" not in serialized


def test_alert_workflow_uses_atomic_deduplicated_claim() -> None:
    serialized = json.dumps(_workflow("cashflow_risk_alerts.json"))
    assert "claim_cashflow_alerts()" in serialized
    assert "pythonCode" not in serialized


def test_workflows_do_not_embed_known_secret_shapes() -> None:
    forbidden = ("sk_live_", "ghp_", "github_pat_", "eyJhbGciOi")
    for path in WORKFLOW_DIR.glob("*.json"):
        content = path.read_text()
        assert not any(marker in content for marker in forbidden)
