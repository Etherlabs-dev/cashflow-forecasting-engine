import calendar
from datetime import date, timedelta

from .models import Frequency, RecurringCashEvent


def occurrences(event: RecurringCashEvent, start: date, end: date) -> tuple[date, ...]:
    """Return recurrence dates in the inclusive window without month-end drift."""

    if end < start:
        return ()
    candidate = event.start_date
    anchor_day = event.day_of_month or event.start_date.day
    output: list[date] = []
    index = 0
    while candidate <= end and (event.end_date is None or candidate <= event.end_date):
        if candidate >= start:
            output.append(candidate)
        index += 1
        candidate = _occurrence_at(event, index, anchor_day)
    return tuple(output)


def _occurrence_at(event: RecurringCashEvent, index: int, anchor_day: int) -> date:
    if event.frequency == Frequency.WEEKLY:
        return event.start_date + timedelta(weeks=index * event.interval_count)
    if event.frequency == Frequency.MONTHLY:
        month_index = event.start_date.year * 12 + event.start_date.month - 1
        month_index += index * event.interval_count
        year, zero_month = divmod(month_index, 12)
        month = zero_month + 1
        day = min(anchor_day, calendar.monthrange(year, month)[1])
        return date(year, month, day)
    year = event.start_date.year + index * event.interval_count
    day = min(anchor_day, calendar.monthrange(year, event.start_date.month)[1])
    return date(year, event.start_date.month, day)
