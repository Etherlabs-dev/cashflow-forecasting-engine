# Evidence and Claim Policy

This repository is a public reference implementation for cash-flow intelligence and scenario modeling.

## Evidence classes

| Label | Meaning |
|---|---|
| **Implemented** | Present in code/workflow/schema artifacts |
| **Tested** | Covered by executable automated tests |
| **Synthetic / Demonstration** | Uses sample or generated finance data |
| **Backtested** | Forecast generated at a historical point and compared with realized outcomes |
| **Production** | Verified live deployment evidence |
| **Client Outcome** | Real customer result with evidence/permission |

## Current repository status

**Reference Implementation / Portfolio System**

### Implemented
- deterministic Python forecast/scenario service and database/schema assets;
- n8n workflow assets;
- scenario and alert deduplication logic;
- React/TypeScript dashboard source;
- frozen-forecast backtesting;
- setup and architecture documentation.

### Tested
- deterministic feature tests under Python 3.11;
- malformed, missing, stale, duplicate, currency, recurrence and boundary behavior;
- scenario isolation, runway and alert lifecycle behavior;
- HTTP contract and n8n JSON contracts;
- frontend TypeScript and production build;
- PostgreSQL 16 schema execution.

### Synthetic / demonstration
The generated backtest artifact is labelled `synthetic_backtest`. It validates the comparison mechanism and does not establish accuracy on a real business.

### Not established by this repository alone
- real-company forecast accuracy;
- actual runway prediction performance;
- time saved by a live finance team;
- production uptime or throughput;
- business impact from decisions made with the forecast.

## Required evidence for a future accuracy claim

A forecast-accuracy claim should include:
- company/data context or appropriately anonymized dataset;
- forecast as-of date;
- horizon (7/30/60/90 days);
- frozen assumptions used at forecast time;
- realized cash values;
- error metric such as MAE/MAPE where appropriate;
- treatment of one-off transactions and structural changes;
- number of backtest windows;
- benchmark comparison against a simpler baseline.

Do not present a visually plausible projected curve as evidence of predictive accuracy.
