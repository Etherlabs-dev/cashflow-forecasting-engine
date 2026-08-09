# Reliability and Forecast Failure Modes

Cash-flow systems can fail while every service remains technically online. The key reliability question is whether the forecast is built from complete, current, correctly interpreted financial data.

## 1. Stale source data

**Risk:** the forecast runs successfully against yesterday's or last week's inputs.

**Controls:**
- record `source_updated_at` / ingestion timestamps;
- define freshness thresholds per source;
- block or visibly degrade forecasts when critical sources are stale;
- surface freshness in the dashboard.

## 2. Duplicate financial events

Use stable source identifiers and idempotent upserts so replayed sync jobs cannot double-count cash movements.

## 3. Missing data treated as zero

Missing payroll, AR or AP data should not silently become zero.

**Control:** distinguish `missing`, `unknown`, and actual numeric zero.

## 4. Currency mixing

Do not aggregate different currencies as if they are directly comparable.

**Control:** either enforce a single reporting currency or version the FX rates used for conversion.

## 5. Timezone/date-boundary errors

Cash dates, due dates and settlement dates can shift across timezones.

**Control:** define a canonical timezone/date policy and test month-end/day-boundary cases.

## 6. Assumption drift

Forecast behavior can change because someone edits a growth rate, payroll schedule or collection assumption.

**Controls:**
- version assumptions;
- store them with each forecast run;
- record author/time/reason when possible;
- make scenario deltas explicit rather than mutating the baseline silently.

## 7. Scenario contamination

A what-if scenario must not alter baseline forecast state.

**Control:** immutable baseline + versioned scenario runs.

## 8. Alert storms

A runway threshold can trigger the same alert every scheduled run.

**Control:** alert state, deduplication keys, escalation policy and recovery/close events.

## 9. Forecast certainty illusion

One projected line can imply false precision.

**Control:** expose assumptions and, where justified, scenario or uncertainty bands. Do not fabricate statistical confidence intervals if the model does not support them.

## 10. No backtesting

Without historical forecast-vs-actual comparison, the system cannot make a credible accuracy claim.

**Control:** persist forecasts as-of their run date and evaluate them later against realized cash positions.

## 11. React/data-contract drift

Frontend types can diverge from database/API outputs.

**Control:** typed schema/contracts and CI that builds the frontend against representative fixtures.

## 12. Sensitive finance data

Use least-privilege credentials, server-side secret storage, row-level/role-based access where appropriate, and avoid exposing raw finance secrets in frontend bundles.

## Observability target

Track:
- source freshness;
- ingestion errors;
- duplicate-event count;
- forecast run success/failure;
- input row counts;
- scenario runs;
- alert count/deduplication;
- forecast horizon coverage;
- actual-vs-forecast error once backtesting exists.

## Acceptance tests

A stronger implementation should test:
- deterministic forecast output for fixed fixtures;
- missing critical source behavior;
- stale source behavior;
- duplicate event ingestion;
- date boundaries/month-end;
- recurring inflow/outflow generation;
- scenario isolation;
- runway threshold crossing;
- alert deduplication;
- invalid currency/multi-currency handling;
- frontend build/type checks;
- historical backtest calculations.

The forecast and scenario logic should be executable outside n8n so these behaviors can be tested directly.