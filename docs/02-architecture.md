# Architecture & Data Flow

This document explains the **end-to-end architecture** of the 90-Day Cash Flow Intelligence Engine:

- System components
- Data model and flow
- How n8n, Supabase and React interact
- Where external APIs plug in

---

## 1. High-Level Architecture

At a high level, the system is composed of:

- **Data sources**
  - Internal seed data (for demo)
  - External providers (QuickBooks, Stripe, Gusto, Plaid, etc.)

- **Automation layer (n8n)**
  - Ingestion workflows
  - Aggregation workflow
  - Forecasting engine
  - Scenario runner
  - Alert engine

- **Data warehouse (Supabase/Postgres)**
  - Normalised tables for raw events (bank, AR, AP, payroll, expenses)
  - Derived tables (cash events, daily snapshots, forecasts, scenarios, alerts)

- **Presentation layer (React dashboard)**
  - Overview, scenarios, working capital, and case study pages
  - Uses Supabase JS client for querying

---

## 2. Component Diagram

> For a visual diagram, you can store an image in `assets/diagrams/architecture.png` and reference it here.

![System Architecture](../assets/diagrams/architecture.png)

**Textual summary:**

- n8n pulls data from **external APIs** and/or **Supabase**.
- n8n writes normalised and derived data into **Supabase**.
- The React dashboard queries Supabase directly to render charts & KPIs.
- Alerts can be pushed out via Slack/email from n8n.

---

## 3. Data Flow Overview

### 3.1. Data Ingestion

**Sources:**

- Bank / card transactions
- AR invoices
- AP bills
- Payroll runs
- Operating expenses

**Flow:**

1. n8n workflows call external APIs or Supabase/selects to fetch data.
2. Code nodes map provider-specific records into a unified internal format.
3. The mapped records are inserted into the following tables:
   - `bank_transactions`
   - `ar_invoices`
   - `ap_bills`
   - `payroll_runs`
   - `operating_expenses`
4. A dedicated n8n workflow optionally consolidates these into `cash_events`.

### 3.2. Aggregation & Daily Cash Snapshots

1. n8n reads from `cash_events` for a given company and date range.
2. It calculates:
   - Opening balance for each date
   - Total inflows / outflows per day
   - Net cash and closing balance
   - Rolling statistics (7-day, 30-day burn)
3. Results are stored in `daily_cash_snapshots`.

### 3.3. Forecasting

1. n8n fetches the last N months of `daily_cash_snapshots`.
2. A Code node estimates:
   - Typical inflows / outflows
   - Volatility
   - Basic growth assumptions
3. It then projects forward for 90 days:
   - Base case: expected net cash
   - Best case: optimistic adjustments
   - Worst case: pessimistic adjustments
4. Each forecast run is stored as:
   - A row in `forecast_runs` (`scenario_id`, `run_label`, `run_at`, `assumptions`)
   - Associated rows in `cash_forecasts` (`forecast_run_id`, `date`, base/best/worst balances).

### 3.4. Scenario Modelling

1. The Scenario Runner workflow accepts input (usually via webhook):
   - Scenario name
   - Growth adjustments
   - Additional payroll / costs
2. It fetches the latest baseline forecast and applies adjustments to simulate:
   - Different growth/revenue paths
   - Changes in operating cost structure
3. It writes records to:
   - `scenario_runs` – scenario metadata
   - `cash_forecasts` – scenario-specific forecasts
   - Optionally `scenario_forecast_deltas` – differences vs baseline.

### 3.5. Runway & Risk Alerts

1. The Alerts workflow reads the latest baseline forecast and/or worst-case.
2. It computes:
   - Date where cash falls below a given threshold
   - Days of runway from today
3. If threshold is breached:
   - Inserts an `alert_events` row with severity & details.
   - Optionally sends Slack/email alerts.

---

## 4. Data Model (Conceptual)

You can think of the schema in layers:

1. **Source Data Layer**
   - `bank_transactions`
   - `ar_invoices`
   - `ap_bills`
   - `payroll_runs`
   - `operating_expenses`

2. **Unified Cash Events**
   - `cash_events`
   - Each record tagged with:
     - Source (`bank`, `AR`, `AP`, `payroll`, `opex`)
     - Direction (`in`, `out`)
     - Amount, currency, date

3. **Daily Aggregates**
   - `daily_cash_snapshots`
   - Designed for fast queries in the dashboard.

4. **Forecasts & Scenarios**
   - `forecast_runs`
   - `cash_forecasts` (base/best/worst, per day)
   - `scenario_runs`
   - `scenario_forecast_deltas`

5. **Alerts**
   - `alert_events`

---

## 5. How n8n, Supabase and React Interact

- **n8n ↔ External APIs**
  - HTTP Request nodes and/or provider-specific nodes
  - Authentication via API keys/OAuth
  - JSON responses processed in Code nodes

- **n8n ↔ Supabase**
  - Supabase node (using URL + key credentials)
  - Used for:
    - Insert / upsert rows into tables
    - Select rows for transformations

- **React ↔ Supabase**
  - Uses Supabase JS client in `supabaseClient.ts`
  - Performs:
    - `select()` from `daily_cash_snapshots`, `cash_forecasts`, `scenario_runs`, `alert_events`, etc.
  - Results rendered as charts and cards.

---

## 6. Extensibility

The design intentionally supports extensions:

- Add new data sources by:
  - Creating a new n8n ingestion workflow
  - Mapping into `cash_events` or relevant tables

- Swap forecasting logic:
  - Replace simple heuristics with more advanced models (e.g., ML)
  - Keep `cash_forecasts` interface consistent for the UI

- Add more dashboards:
  - Segmented by product line, geography, customer cohort, etc.

---

## 7. Related Documents

- [01-overview.md](./01-overview.md) – high-level overview
- [03-supabase-setup.md](./03-supabase-setup.md) – database setup steps
- [04-n8n-workflows.md](./04-n8n-workflows.md) – workflow details
- [05-external-apis-and-mapping.md](./05-external-apis-and-mapping.md) – provider integration details
- [06-dashboard-walkthrough.md](./06-dashboard-walkthrough.md) – UI walkthrough
