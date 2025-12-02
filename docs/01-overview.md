# 90-Day Cash Flow Intelligence Engine – Overview

This document gives a **high-level overview** of the 90-Day Cash Flow Intelligence Engine project.

The goal is to provide a reusable blueprint for:

- Centralising financial data (bank, AR, AP, payroll, expenses) in **Supabase**
- Automating ingestion, aggregation and forecasting using **n8n**
- Visualising cash position, runway, and scenarios in a **React dashboard**

---

## 1. Problem This Project Solves

Most finance teams rely on spreadsheets to answer critical questions:

- “How much cash will we have in 60–90 days?”
- “Can we afford to hire 5 more people?”
- “What if revenue drops 20% next quarter?”
- “What if we delay payments or speed up collections?”

Typical issues:

- Fragile Excel models that break as the business changes
- No unified view across bank, AR, AP, payroll, and expenses
- No structured *scenario modelling*
- Cash crunches discovered too late

This project addresses those pain points by combining:

- **Automation** (n8n)  
- **Data warehousing** (Supabase/Postgres)  
- **Analytics & UX** (React dashboard)

---

## 2. What the System Does

At a high level, the system:

1. **Ingests Data**
   - Bank transactions
   - Accounts Receivable (AR) invoices
   - Accounts Payable (AP) bills
   - Payroll runs
   - Operating expenses
   - Optionally from real external APIs (QuickBooks, Stripe, Gusto, Plaid, etc.)

2. **Normalises & Aggregates**
   - Normalises raw data into a unified **cash events** model
   - Computes **daily cash snapshots**:
     - Opening balance
     - Inflows / outflows
     - Closing balance
     - Rolling burn metrics

3. **Forecasts 90 Days Ahead**
   - Uses recent historical patterns (inflows, outflows, volatility) to:
     - Project cash for the next 90 days
     - Compute base / best / worst-case trajectories
     - Derive **runway** (days until cash crosses a threshold)

4. **Runs What-If Scenarios**
   - Accepts scenario parameters like:
     - Revenue growth adjustments (e.g. –20%, +30%)
     - Extra payroll (e.g. hiring X new people)
     - Expense changes (e.g. cut marketing 30%)
   - Generates scenario-specific forecasts and compares them to baseline.

5. **Raises Alerts**
   - Detects when projected cash falls:
     - Below a configurable threshold
     - Below zero within the forecast horizon
   - Logs alerts to Supabase and optionally pushes to Slack/email.

6. **Visualises Everything in a Dashboard**
   - Historical vs forecasted cash
   - Runway KPIs
   - AR/AP working capital view
   - Scenario comparison charts
   - Alert banners and detail views

---

## 3. Core Technologies

- **n8n** – Workflow automation, ETL, orchestration, and simple backend logic
- **Supabase** – Postgres database + API layer + authentication (if needed)
- **React** – Front-end UI for dashboards and case study pages
- **TypeScript** – Strongly typed code for the dashboard
- **External APIs (optional)**:
  - QuickBooks (AR/AP, GL)
  - Stripe (payments)
  - Gusto (payroll)
  - Plaid (bank transactions)

---

## 4. Repository Layout (Quick View)

- [`sql/`](../sql)  
  Database schema and seed data.

- [`n8n/`](../n8n)  
  All n8n workflows (JSON exports) for ingestion, aggregation, forecasting, scenarios, and alerts.

- [`dashboard-react/`](../dashboard-react)  
  React dashboard app for viewing cash position, forecasts, and scenarios.

- [`docs/`](./)  
  This documentation set: overview, architecture, setup, workflows, mapping, and UI walkthrough.

- [`assets/`](../assets)  
  Diagrams and screenshots used in the docs and README.

---

## 5. Who This Is For

This project is useful for:

- Founders / CFOs who want a **repeatable cash intelligence engine**
- Financial automation / FinOps engineers showcasing full-stack capability
- Data engineers who need a practical, opinionated starting point for cash analytics
- Anyone using **n8n + Supabase + React** for financial use cases

You can fork it, adapt it to your stack, plug your own APIs, and ship your own cash intelligence tool.

---

## 6. Next Steps

If you’re new to the repo:

1. Read [02-architecture.md](./02-a)

