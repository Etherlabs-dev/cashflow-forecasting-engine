from datetime import UTC, date, datetime
from decimal import Decimal

import pytest

from cashflow_engine.models import CashEvent, DailyActual, ForecastAssumptions

COMPANY = "company-1"
AS_OF = date(2025, 1, 31)
FRESH = datetime(2025, 1, 31, 12, tzinfo=UTC)


@pytest.fixture
def actuals():
    return [DailyActual(COMPANY, AS_OF, Decimal("1000"), "USD", FRESH)]


@pytest.fixture
def cash_events():
    return [
        CashEvent("in-1", COMPANY, date(2025, 1, 10), Decimal("310"), "USD", FRESH),
        CashEvent("out-1", COMPANY, date(2025, 1, 20), Decimal("-155"), "USD", FRESH),
    ]


@pytest.fixture
def assumptions():
    return ForecastAssumptions(
        as_of_date=AS_OF,
        horizon_days=30,
        lookback_days=31,
        opening_balance=Decimal("1000"),
        reporting_currency="USD",
        max_source_age_days=1,
    )
