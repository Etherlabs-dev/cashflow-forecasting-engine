from datetime import date
from decimal import Decimal

from cashflow_engine.models import Frequency, RecurringCashEvent
from cashflow_engine.recurrence import occurrences


def test_month_end_recurrence_preserves_anchor_without_drift():
    event = RecurringCashEvent("rent", date(2025, 1, 31), Decimal("-100"), "USD", Frequency.MONTHLY)
    assert occurrences(event, date(2025, 2, 1), date(2025, 4, 30)) == (
        date(2025, 2, 28),
        date(2025, 3, 31),
        date(2025, 4, 30),
    )


def test_leap_year_yearly_recurrence_clamps_february():
    event = RecurringCashEvent(
        "insurance", date(2024, 2, 29), Decimal("-1200"), "USD", Frequency.YEARLY
    )
    assert occurrences(event, date(2025, 1, 1), date(2028, 3, 1)) == (
        date(2025, 2, 28),
        date(2026, 2, 28),
        date(2027, 2, 28),
        date(2028, 2, 29),
    )


def test_weekly_interval_and_inclusive_boundaries():
    event = RecurringCashEvent(
        "weekly", date(2025, 1, 1), Decimal("50"), "USD", Frequency.WEEKLY, 2
    )
    assert occurrences(event, date(2025, 1, 15), date(2025, 2, 1)) == (
        date(2025, 1, 15),
        date(2025, 1, 29),
    )
