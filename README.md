# 90-Day Cash Flow Intelligence Engine

> Tested reference implementation for deterministic cash forecasting, isolated what-if scenarios, runway alerts and frozen forecast backtesting.

**Status:** Tested reference implementation / portfolio system
**Evidence:** No client deployment, production SLA, business outcome or real-world forecast-accuracy claim is made.

## What is implemented

- A Python 3.11 forecast service with Decimal-based calculations, explicit as-of dates, freshness checks, duplicate detection, recurring events, frozen FX rates and immutable assumption/scenario snapshots.
- Reproducible run IDs and SHA-256 assumption fingerprints.
- Base, best, worst and isolated scenario projections.
- Alert lifecycle logic that suppresses duplicate active alerts.
- Frozen-forecast backtesting and a deterministic **synthetic** fixture/report.
- PostgreSQL schema for persisted forecasts, provenance, backtests and idempotent result persistence.
- Six importable n8n workflow artifacts. Forecast and scenario workflows delegate calculation to the Python service; n8n remains the orchestration boundary.
- A flattened React/Vite dashboard with typed builds and explicit synthetic/configured evidence labels.

## Architecture

```text
providers / files -> n8n adapters -> canonical cash events
                                          |
                                          v
                         deterministic Python service
                         (assumptions + scenario + as-of)
                                          |
                                          v
                    PostgreSQL immutable runs and forecasts
                              |                    |
                              v                    v
                    deduplicated alerts      React dashboard
                              |
                              v
                    frozen-run backtesting
```

The service fails closed when required history is missing, a source watermark is stale/future-dated, input values are invalid, duplicates conflict, or a currency lacks an explicit frozen FX rate. See [architecture](./docs/02-architecture.md), [evidence](./docs/09-evidence.md), and [reliability](./docs/10-reliability.md).

## Repository layout

```text
src/cashflow_engine/   deterministic domain logic and HTTP service
tests/                 unit, API, workflow-contract and synthetic-backtest tests
scripts/               reproducible synthetic backtest command
sql/                   PostgreSQL schema and persistence functions
n8n/                   disabled-by-default orchestration exports
dashboard-react/       React/Vite application (repository-rooted frontend)
docs/                  architecture, setup, mapping and evidence notes
```

## Reproduce locally

Python 3.11:

```bash
python3.11 -m venv .venv
.venv/bin/pip install -e '.[dev]'
.venv/bin/ruff check .
.venv/bin/pytest
PYTHONPATH=src .venv/bin/python scripts/run_synthetic_backtest.py
```

Dashboard (Node 22+):

```bash
cd dashboard-react
npm ci
npm run typecheck
npm run build
npm run dev
```

Service:

```bash
.venv/bin/uvicorn cashflow_engine.service:app --app-dir src
```

Database: execute `sql/schema.sql` against PostgreSQL 16. The n8n exports are intentionally inactive and require `FORECAST_ENGINE_URL`, `FORECAST_ENGINE_TOKEN`, platform-managed database credentials, and provider credentials before activation.

## Evidence summary

| Item | Label | Meaning |
|---|---|---|
| Deterministic calculation suite | **Tested** | Executed locally under Python 3.11 |
| Frontend type check/build | **Tested** | Executed using the locked npm dependency graph |
| PostgreSQL schema | **Tested** | Executed against an isolated PostgreSQL 16 instance |
| Backtest artifact | **Synthetic backtest** | Measures the engine on generated fixtures only |
| Workflow provider integrations | **Implemented artifacts / not live-verified** | No connected provider execution is claimed |
| Real-company forecast accuracy | **Not established** | Requires frozen production forecasts and later actuals |
| Client savings or business impact | **Not claimed** | No client evidence exists in this repository |

## Important limitations

- Source adapters still contain provider-specific normalization in n8n; only the financial forecast/scenario rules have been extracted.
- Notification transport and authenticated provider runs are not configured here.
- The dashboard bundle can be further code-split.
- Tenant authorization/RLS must be designed for the deployment identity model before production use.
- Any previously exposed Supabase project key should be rotated even if it was an anonymous client key; the current tree contains no credential value.

MIT licensed. Built by **Ugo Chukwu / Etherlabs**.
