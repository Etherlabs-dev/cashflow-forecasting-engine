from datetime import UTC, datetime
from decimal import Decimal

from fastapi.testclient import TestClient

from cashflow_engine.service import app


def payload():
    updated_at = datetime(2025, 1, 31, 12, tzinfo=UTC).isoformat()
    return {
        "company_id": "company-1",
        "actuals": [
            {
                "company_id": "company-1",
                "actual_date": "2025-01-31",
                "closing_balance": "1000",
                "currency": "USD",
                "source_updated_at": updated_at,
            }
        ],
        "cash_events": [
            {
                "event_id": "event-1",
                "company_id": "company-1",
                "event_date": "2025-01-20",
                "amount": "310",
                "currency": "USD",
                "source_updated_at": updated_at,
            }
        ],
        "assumptions": {
            "as_of_date": "2025-01-31",
            "horizon_days": 7,
            "lookback_days": 31,
            "opening_balance": "1000",
            "reporting_currency": "USD",
            "max_source_age_days": 1,
        },
    }


def test_forecast_endpoint_returns_persistable_frozen_contract():
    response = TestClient(app).post("/v1/forecast", json=payload())
    assert response.status_code == 200
    body = response.json()
    assert body["run"]["as_of_date"] == "2025-01-31"
    assert body["run"]["assumptions"]["horizon_days"] == 7
    assert len(body["daily_forecasts"]) == 7
    assert body["daily_forecasts"][0]["date"] == "2025-02-01"


def test_forecast_endpoint_rejects_missing_data_and_unknown_fields():
    invalid = payload()
    invalid["cash_events"] = []
    assert TestClient(app).post("/v1/forecast", json=invalid).status_code == 422
    invalid = payload()
    invalid["unexpected"] = True
    assert TestClient(app).post("/v1/forecast", json=invalid).status_code == 422


def test_decimal_values_are_not_converted_to_binary_float():
    response = TestClient(app).post("/v1/forecast", json=payload())
    first = response.json()["daily_forecasts"][0]
    assert Decimal(str(first["base_closing_balance"])) == Decimal("1010.00")
