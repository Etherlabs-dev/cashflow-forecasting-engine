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
- database/schema assets;
- n8n workflow assets;
- scenario and alerting design;
- React/TypeScript dashboard source;
- setup and architecture documentation.

### Synthetic / demonstration
Sample seed data and scenario demonstrations are useful for validating behavior but do not establish forecast accuracy.

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