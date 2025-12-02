# n8n Workflows – Detailed Breakdown

This document walks through each n8n workflow included in the project:

- What it does
- How it’s triggered
- Key nodes and Supabase interactions
- Where to attach your screenshots

> All workflow JSON exports live in [`/n8n`](../n8n).

---

## 1. cashflow_data_sync_supabase.json

**Path:** [`n8n/cashflow_data_sync_supabase.json`](../n8n/cashflow_data_sync_supabase.json)

**Purpose:**  
Ingest raw financial data (or sample data) and ensure core tables in Supabase are up to date.

**Typical Trigger:**

- Cron (e.g. every night at 01:00)
- Can also be manually triggered from the n8n UI for testing

**Main Responsibilities:**

- Fetch new records from:
  - Bank / payments data (or sample transactions)
  - AR invoices
  - AP bills
  - Payroll runs
  - Operating expenses
- Map them into Supabase-friendly rows.
- Insert or upsert into:
  - `bank_transactions`
  - `ar_invoices`
  - `ap_bills`
  - `payroll_runs`
  - `operating_expenses`
- Optionally normalise into `cash_events`.

**Key Nodes:**

- `Cron` – schedule
- One or more `HTTP Request` or `Supabase` **select** nodes for each data source
- `Code` nodes (Python) for mapping and cleaning
- `Supabase` `create` or `upsert` nodes

**Screenshot placeholder:**


![Data Sync Workflow](../assets/diagrams/n8n-cashflow-data-sync.png)



## 2. `cashflow_aggregation_daily.json`

**Path:** `n8n/cashflow_aggregation_daily.json`
**Purpose:** Compute daily cash snapshots from `cash_events` and store them in `daily_cash_snapshots`.

**Typical Trigger:**
* Runs after `cashflow_data_sync_supabase`
* Cron (e.g. `02:00` daily)

**Main Responsibilities:**
* Query `cash_events` for the relevant date range.
* For each day:
    * Compute opening balance
    * Compute inflows and outflows
    * Compute net cash and closing balance
    * Optionally compute moving averages (burn rate, etc.)
* Insert results into `daily_cash_snapshots`.

**Key Nodes:**
* Cron – or manual trigger
* Supabase select from `cash_events`
* Code node calculating daily aggregates
* Supabase create node inserting records into `daily_cash_snapshots`

**Screenshot placeholder:**

![Daily Aggregation Workflow](../assets/diagrams/n8n-cashflow-aggregation-daily.png)

---

## 3. `cashflow_forecast_engine.json`

**Path:** `n8n/cashflow_forecast_engine.json`
**Purpose:** Generate a 90-day cash forecast based on historical daily snapshots.

**Typical Trigger:**
* Runs after `cashflow_aggregation_daily`
* Cron (e.g. `03:00` daily)

**Main Responsibilities:**
* Read recent history from `daily_cash_snapshots` (e.g. last 90–180 days).
* Use a heuristic model to:
    * Estimate expected inflows/outflows
    * Apply a growth factor (if any)
    * Derive base, best, worst-case projections for the next 90 days.
* Insert a new row into `forecast_runs` capturing:
    * `run_label` (e.g. "baseline")
    * `run_at`
    * `assumptions` (JSON)
* Insert per-day forecast rows into `cash_forecasts` linked to the `forecast_run_id`.

**Key Nodes:**
* Cron or Execute Workflow trigger
* Supabase select from `daily_cash_snapshots`
* Code node implementing forecast logic
* Supabase create nodes:
    * One for `forecast_runs`
    * One (or more) for `cash_forecasts`

**Screenshot placeholder:**

![Forecast Engine Workflow](../assets/diagrams/n8n-cashflow-forecast-engine.png)

---

## 4. `cashflow_scenario_runner.json`

**Path:** `n8n/cashflow_scenario_runner.json`
**Purpose:** Run what-if scenarios on top of the baseline forecast.

**Typical Trigger:**
* Webhook node, invoked from:
    * The React dashboard “Create Scenario” form
    * API clients such as Postman

**Input Payload (example):**

```json
{
  "scenario_name": "Hire 5 Engineers",
  "growth_adjustment": -0.05,
  "additional_monthly_payroll": 25000
}

```

### Main Responsibilities:

* Accept scenario configuration (name + parameters).
* Fetch baseline forecast and/or relevant daily history.
* Recompute forecasts with scenario adjustments:
    * Add extra outflows (e.g. payroll)
    * Adjust inflows for growth changes
* Insert into:
    * `scenario_runs` (metadata)
    * `cash_forecasts` (scenario forecasts)
    * optionally `scenario_forecast_deltas` (difference vs baseline).

Key Nodes:

* **Webhook** – receives scenario parameters
* **Supabase select** for:
    * Latest baseline `forecast_runs`
    * Associated rows in `cash_forecasts`
* **Code node** – scenario-adjusted forecast logic
* **Supabase create** nodes:
    * `scenario_runs`
    * `cash_forecasts` / `scenario_forecast_deltas`

Screenshot placeholder:

![Scenario Runner Workflow](../assets/diagrams/n8n-cashflow-scenario-runner.png)

### 5. cashflow_risk_alerts.json

**Path:** `n8n/cashflow_risk_alerts.json`

**Purpose:**

* Detect and log runway risk and trigger alerts.

**Typical Trigger:**

* Cron (e.g. 04:00 daily)

**Main Responsibilities:**

* Read latest baseline (and optionally worst-case) forecast from `cash_forecasts`.
* Compute:
    * Date where `base_closing_balance` crosses below threshold (e.g. 0 or 2-month buffer).
    * Runway in days from current date.
* If conditions are met:
    * Insert a row into `alert_events` with:
        * `alert_type`
        * `severity`
        * `message`
        * `details` (JSON)
    * Optionally post a Slack/Email alert.

**Key Nodes:**

* **Cron**
* **Supabase select** from `forecast_runs` and `cash_forecasts`
* **Code node** computing runway and building alert message
* **Supabase create** into `alert_events`
* Optional:
    * **Slack** node
    * **Email** node

Screenshot placeholder:

![Risk Alerts Workflow](../assets/diagrams/n8n-cashflow-risk-alerts.png)

### 6. cashflow_extended_data_sync_apis.json

**Path:** `n8n/cashflow_extended_data_sync_apis.json`

**Purpose:**

* Showcase production-style integrations with external APIs for:
    * Accounting (QuickBooks)
    * Payments (Stripe)
    * Payroll (Gusto)
    * Banking (Plaid)

**Typical Trigger:**

* Cron (e.g. 06:00 daily)
* or manually when running against sandbox environments.

**Main Responsibilities:**

* For each provider:
    * **HTTP Request node** → call the relevant API endpoint.
    * **Code node** → transform provider-specific response.
    * **Supabase node** → insert into the correct table:
        * `bank_transactions`
        * `ar_invoices`
        * `ap_bills`
        * `payroll_runs`

**Examples:**

* Stripe → `bank_transactions` (charges → inflows)
* QuickBooks (Invoices) → `ar_invoices`
* QuickBooks (Bills) → `ap_bills`
* Gusto → `payroll_runs`
* Plaid → `bank_transactions`

This workflow is your reference when showing that you can wire up real APIs into the engine.

Screenshot placeholder:

![Extended Data Sync APIs Workflow](../assets/diagrams/n8n-cashflow-extended-apis.png)

### 7. Tips for Working with Workflows

* Use workflow **tags** in n8n to group all cashflow-related flows.
* Document credentials in n8n using n8n’s own **Credentials** system, not hard-coded secrets.
* When changing schemas:
    1.  Update the SQL first.
    2.  Then adjust Supabase nodes + Code node mappings.

### 8. Related Docs

* `03-supabase-setup.md` – how the DB is configured.
* `05-external-apis-and-mapping.md` – detailed provider → table mapping.
* `06-dashboard-walkthrough.md` – to see how the workflows feed the UI.
