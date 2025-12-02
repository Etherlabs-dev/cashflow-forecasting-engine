# Dashboard Walkthrough

This document walks through the **React dashboard** that visualises the cash flow engine:

- Pages and navigation
- What each section shows
- How the UI ties back to Supabase tables
- Where screenshots fit into the story

---

## 1. Overview Page (`/`)

### 1.1. Purpose

Give a CFO / founder a **single-screen snapshot** of the company’s cash position and short-term future.

### 1.2. Layout

Typical layout:

1. **Header / Hero Strip**
   - Project name and short description
   - Optional link to GitHub / Dev.to article

2. **KPI Cards**
   - **Current Cash Balance**
     - Derived from latest `daily_cash_snapshots.closing_balance`
   - **Runway (Base Case)**
     - Days until `cash_forecasts.base_closing_balance` crosses below a threshold
   - **Runway (Worst Case)**
     - Same idea but using `worst_closing_balance`
   - **Next 30-Day Net Cash**
     - Sum of `cash_forecasts.base_net_cash` over the next 30 days

3. **Cash Position Chart**
   - Line chart overlaying:
     - Historical `daily_cash_snapshots.closing_balance` (past N days)
     - Forecasted `cash_forecasts.base_closing_balance` (next 90 days)
   - Optional bands for best/worst case using:
     - `cash_forecasts.best_closing_balance`
     - `cash_forecasts.worst_closing_balance`

4. **Alerts Panel**
   - Shows latest rows from `alert_events`:
     - Severity (info/warning/critical)
     - Alert type (e.g. `runway_below_threshold`)
     - Message & created_at
   - If no alerts: a friendly “All clear” message.

### 1.3. Example Queries

- Current cash:

  ```ts
  const { data } = await supabase
    .from('daily_cash_snapshots')
    .select('*')
    .eq('company_id', companyId)
    .order('date', { ascending: false })
    .limit(1);


Here is that content converted to GitHub-flavored Markdown:

````markdown
Forecast for next 90 days:

```javascript
const { data } = await supabase
  .from('cash_forecasts')
  .select('*')
  .eq('forecast_run_id', latestBaselineRunId)
  .order('date', { ascending: true });
````

#### 1.4. Screenshot placeholder

## 2\. Scenarios Page (/scenarios)

### 2.1. Purpose

Allow a user to:

  * Compare the baseline forecast to one or more scenarios
  * Create new scenarios using structured parameters
  * Understand how decisions (hiring, growth, cuts) affect runway and min cash

### 2.2. Layout

  * **Scenario Selector**
      * Dropdown or pill-based selector
      * Options:
          * Baseline (forecast with `scenario_id = NULL` or default)
          * Each scenario from `scenario_runs`
  * **Scenario Comparison Chart**
      * X-axis: date
      * Y-axis: closing balance
      * Lines:
          * Baseline: `cash_forecasts.base_closing_balance` for baseline run
          * Scenario: `cash_forecasts.base_closing_balance` for selected scenario run
  * **Scenario Impact Summary**
      * Metrics:
          * Difference in runway (baseline vs scenario)
          * Difference in minimum closing balance
          * Date of minimum cash for each
  * **Scenario Creation Form**
      * Inputs (example):
          * `scenario_name` (text)
          * `growth_adjustment` (number, e.g. –0.2 for –20%)
          * `additional_monthly_payroll` (number)
      * On submit:
          * Calls Scenario Runner webhook (backed by n8n).
          * After response, refresh scenario list.

### 2.3. Data Sources

  * `scenario_runs` – to populate the selector
  * `cash_forecasts` – to draw lines for each scenario
  * `forecast_runs` – to associate runs with scenarios and labels

### 2.4. Screenshot placeholder

## 3\. Working Capital Page (/working-capital)

### 3.1. Purpose

Give a working capital lens on cash:

  * How much is tied up in AR?
  * How much is due in AP?
  * Aging of AR/AP by bucket.

### 3.2. Layout

  * **Summary KPIs**
      * Total AR (open invoices)
      * Total AP (open bills)
      * Net working capital (AR – AP)
  * **AR Aging Chart**
      * Buckets (from a view like `vw_working_capital_summary`):
          * 0–30 days
          * 31–60 days
          * 61–90 days
          * 90+ days
      * Rendered as stacked or grouped bars.
  * **AP Aging Chart**
      * Same buckets, but for `ap_*` values.
  * **Narrative / Explanation**
      * Short description of how AR/AP patterns feed into the forecast:
          * When AR is collected
          * When AP gets paid
      * Connects to the forecasting assumptions stored in `parameters`.

### 3.3. Data Sources

  * `vw_working_capital_summary` (if implemented as a view)
      * `ar_total`, `ap_total`
      * `ar_0_30`, `ar_31_60`, etc.
      * `ap_0_30`, `ap_31_60`, etc.
  * or
      * Direct aggregation from `ar_invoices` and `ap_bills` tables.

### 3.4. Screenshot placeholder

## 4\. Case Study Page (/case-study)

### 4.1. Purpose

This page turns the project into a portfolio case study:

  * Explain the problem
  * Show the architecture
  * Highlight the impact and metrics
  * Link to GitHub/Dev.to/Substack

### 4.2. Layout

  * **Problem Section**
      * Short narrative about Excel hell, lack of forecasting, etc.
  * **Solution Section**
      * n8n + Supabase + React architecture
      * Data sources integrated
  * **How It Works (Step-by-Step)**
      * Data ingestion
      * Aggregation
      * Forecasting
      * Scenarios
      * Alerts
  * **Results / Value**
      * Time saved
      * Early visibility into cash crunches
      * Better decision-making around hiring/spend
  * **Links**
      * GitHub repository
      * Dev.to article
      * Substack post
      * Any demo video

### 4.3. Screenshot placeholder

## 5\. UX Principles

The dashboard follows a few core UX principles:

  * **Clarity over complexity**
      * Avoid cluttered graphs; emphasise key lines and KPIs.
  * **One core question per screen**
      * Overview: **“Are we safe?”** (cash + runway)
      * Scenarios: **“What if?”** (baseline vs scenario)
      * Working Capital: **“Where is our cash locked up?”**
  * **Explainability**
      * Tooltips, captions, and short copy sections that explain what each chart shows and why it matters.

## 6\. Technical Notes

  * The dashboard uses a single Supabase client in `lib/supabaseClient.ts`.
  * Data fetching can be:
      * `useEffect` + `supabase.from(...).select(...)`
      * Or a data fetching hook (e.g., React Query/SWR) if you choose to add it.
  * Charts are built on a library like Recharts; you can swap this if preferred.
  * The app can be:
      * Local only (for demos), or
      * Deployed to Vercel/Netlify/etc. with environment variables.

## 7\. Related Docs

  * `03-supabase-setup.md` – how the underlying data is stored.
  * `04-n8n-workflows.md` – how data gets into & updated in Supabase.
  * `02-architecture.md` – big-picture architecture.

<!-- end list -->

```
```
