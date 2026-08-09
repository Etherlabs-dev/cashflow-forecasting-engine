# n8n Workflow Contracts

All six JSON files are valid exports and intentionally have `active: false`. Importing an artifact does not prove that its provider integration has run successfully.

| Workflow | Responsibility |
|---|---|
| `cashflow_data_sync_supabase.json` | canonical source synchronization |
| `cashflow_extended_data_sync_apis.json` | provider-specific Stripe, accounting, payroll and bank mappings |
| `cashflow_aggregation_daily.json` | operational aggregation/parameter preparation |
| `cashflow_forecast_engine.json` | authenticated invocation of `/v1/forecast` and transactional persistence |
| `cashflow_scenario_runner.json` | isolated scenario invocation using the same deterministic service |
| `cashflow_risk_alerts.json` | atomic claim of previously unseen alert records |

Forecast, recurrence, currency, scenario and runway calculations are owned by `src/cashflow_engine`; they are not duplicated inside the forecast/scenario workflows. Credentials use n8n's credential store or environment variables. The repository contains no live token value.

Before activation, configure provider credentials, database credentials, `FORECAST_ENGINE_URL`, `FORECAST_ENGINE_TOKEN`, tenant identity and notification transport. Validate each imported graph in the target n8n version because JSON contract tests do not establish live provider compatibility.
