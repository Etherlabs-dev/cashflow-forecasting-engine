# 90-Day Cash Flow Intelligence Engine

> Reference implementation for unifying finance data, producing 90-day cash forecasts, running what-if scenarios, surfacing runway risk, and presenting the results in an operational dashboard.

**Status:** Reference Implementation / Portfolio System  
**Domain:** Finance Operations · Cash Visibility · Forecasting · Decision Support  
**Stack:** n8n · PostgreSQL/Supabase · React/TypeScript

This repository demonstrates the architecture of a cash-flow decision system: ingest financial events, normalize them into a common model, compute forward-looking cash projections, run scenarios, trigger risk alerts, and expose the result to operators.

It is **not presented as a client deployment or as proof of forecast accuracy in a live company**. Any accuracy, runway or business-impact claim should be tied to a named dataset and reproducible backtest.

---

## Problem

Cash forecasting breaks down when the underlying inputs live across separate systems:

- bank activity;
- accounts receivable;
- accounts payable;
- payroll;
- operating expenses;
- payment processors;
- accounting tools.

A useful system needs more than a spreadsheet projection. It needs a canonical data layer, explicit forecast assumptions, scenario versioning, reproducible calculations and alerting that explains *why* cash risk changed.

---

## System flow

```text
Bank / AR / AP / Payroll / Payments
              ↓
         data ingestion
              ↓
       normalization layer
              ↓
      daily cash snapshots
              ↓
       forecasting engine
          ↙         ↘
   base forecast   scenarios
          \         /
           risk rules
              ↓
       alerts + dashboard
```

---

## Capabilities represented in the repository

### Unified cash-event model
Financial inputs are normalized into a shared data layer so the forecast is not built directly from provider-specific payloads.

### 90-day forecast
The workflow computes forward-looking cash positions from historical/current cash events and configured assumptions.

### Scenario modeling
The design supports what-if adjustments such as:

- revenue growth changes;
- payroll increases;
- expense reductions/increases;
- timing changes in receivables/payables.

### Runway/risk alerts
Forecast outputs can trigger alerts when cash or runway crosses configured thresholds.

### Dashboard
A React/TypeScript dashboard exists under:

```text
dashboard-react/CashFlow90-dashboard/
```

The outer `dashboard-react/package.json` is currently a placeholder file; the real frontend project is nested one directory deeper. This should be cleaned up in the engineering pass.

---

## Repository structure

```text
cashflow-forecasting-engine/
├── sql/                         # schema + seed/sample data
├── n8n/                         # ingestion, forecasting, scenario and alert workflows
├── dashboard-react/
│   └── CashFlow90-dashboard/    # actual React/Vite application
├── docs/                        # architecture, setup, mappings, walkthroughs
├── assets/
├── README.md
└── LICENSE
```

---

## Evidence standard

| Claim | Evidence status |
|---|---|
| SQL/data-model artifacts exist | **Implemented** |
| n8n workflow artifacts exist | **Implemented** |
| React dashboard source exists | **Implemented** |
| Scenario/risk workflow design exists | **Implemented** |
| Sample/seed data | **Synthetic / Demonstration** |
| Forecast accuracy on real company data | **Not established here** |
| Production runway prediction | **Not claimed** |
| Client time/revenue impact | **Not claimed** |

See [`docs/09-evidence.md`](./docs/09-evidence.md).

---

## Forecasting discipline

A cash forecast is only useful if assumptions are explicit.

A portfolio-grade version of this project should make the following visible for every run:

- forecast as-of date;
- opening cash balance;
- data freshness by source;
- recurring inflow/outflow assumptions;
- AR collection assumptions;
- AP payment assumptions;
- payroll schedule;
- scenario deltas;
- confidence/uncertainty treatment;
- actual-vs-forecast error when backtesting becomes available.

The repository should avoid presenting one projected curve as certainty.

---

## Quick start

The project currently combines database, n8n and frontend artifacts. The exact end-to-end startup path still needs consolidation into a reproducible development environment.

### Database

Use the SQL assets under `sql/` to create the schema and load sample data for demonstration/testing.

### Workflows

Import the workflow JSON files under `n8n/` into n8n and configure credentials through the platform's credential manager.

### Dashboard

The actual frontend project is:

```bash
cd dashboard-react/CashFlow90-dashboard
npm install
npm run dev
```

The outer placeholder `dashboard-react/package.json` should not be used.

---

## Reliability requirements

A production cash-intelligence system needs controls around stale inputs and misleading forecasts, not just application uptime.

Key controls include:

- source freshness monitoring;
- idempotent ingestion;
- duplicate-event handling;
- clear missing-data behavior;
- scenario versioning;
- reproducible forecast runs;
- audit trail for assumption changes;
- alert deduplication;
- protection against malformed/negative/unexpected values;
- timezone and currency normalization;
- actual-vs-forecast backtesting;
- role-based access for finance data;
- secrets management.

See [`docs/10-reliability.md`](./docs/10-reliability.md).

---

## Stronger target architecture

n8n can remain valuable for source orchestration and notifications, but forecast calculation and scenario logic should be independently testable.

A stronger portfolio architecture would look like:

```text
source adapters / n8n
        ↓
canonical cash-event tables
        ↓
forecast + scenario library/service  ← deterministic, tested code
        ↓
forecast results + assumptions
        ↓
alerts / dashboard
```

The next engineering pass should extract the forecast/scenario rules into code with deterministic fixtures and backtests instead of leaving the business logic primarily embedded in workflow nodes.

---

## Testing target

A production-style validation suite should cover:

- ingestion idempotency;
- missing-source data;
- negative/invalid values;
- recurring cash-event calculation;
- forecast date boundaries;
- scenario application;
- scenario isolation/versioning;
- runway threshold alerts;
- zero/negative cash crossing;
- duplicate alert suppression;
- multi-currency policy or explicit rejection;
- frontend build and typed data contracts.

A backtest should compare historical forecasts against actual realized cash positions before any accuracy claim is made.

---

## Current limitations

- The frontend is nested under `dashboard-react/CashFlow90-dashboard/` and the outer package file is an empty placeholder.
- Documentation contains multiple architecture documents that should be consolidated.
- There is no clear repository-level automated test/CI contract yet.
- Forecast assumptions need to be surfaced as first-class configuration and result metadata.
- No verified production accuracy or client outcome is claimed by this repository.

---

## License

MIT. See [`LICENSE`](./LICENSE).

---

Built by **Ugo Chukwu / Etherlabs** as a finance-operations and decision-systems reference implementation.