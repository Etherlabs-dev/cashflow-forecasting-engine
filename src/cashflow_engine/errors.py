class ForecastError(ValueError):
    """Base class for deterministic input and policy failures."""


class MissingDataError(ForecastError):
    pass


class StaleDataError(ForecastError):
    pass


class DuplicateEventError(ForecastError):
    pass


class CurrencyConversionError(ForecastError):
    pass
