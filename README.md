# 90-Day Cash Flow Intelligence Engine  
*n8n + Supabase + React Dashboard*

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)
![Stack](https://img.shields.io/badge/stack-n8n%20%7C%20Supabase%20%7C%20React-blueviolet.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue.svg)

A production-style **cash flow forecasting and scenario modeling engine** that:

- Ingests **bank, AR, AP, payroll, and expense data** (via n8n + external APIs)
- Aggregates daily cash and computes **90-day forecasts** into Supabase
- Supports **what-if scenarios** (“hire 5 people”, “growth –20%”, etc.)
- Raises **runway alerts** when cash will fall below a danger threshold
- Visualizes everything in a **React dashboard** on top of Supabase

Designed as a **real-world case study** to demonstrate financial automation, data engineering, and analytics skills with modern tools.

---

## 🧭 Table of Contents

1. [Problem & Motivation](#-problem--motivation)  
2. [High-Level Features](#-high-level-features)  
3. [Architecture Overview](#-architecture-overview)  
4. [Repository Structure](#-repository-structure)  
5. [Supabase Schema](#-supabase-schema)  
6. [n8n Workflows](#-n8n-workflows)  
7. [React Dashboard](#-react-dashboard)  
8. [External API Integrations](#-external-api-integrations)  
9. [Setup & Installation](#-setup--installation)  
10. [Usage Guide](#-usage-guide)  
11. [Demo & Dev.to Article](#-demo--devto-article)  
12. [Roadmap](#-roadmap)  
13. [Contributing](#-contributing)  
14. [License](#-license)  
15. [About the Author](#-about-the-author)  

---

## 🚨 Problem & Motivation

Most finance teams still answer **critical cash questions** with fragile spreadsheets:

- “How much cash will we have in 60–90 days?”
- “Can we afford to hire 5 more people?”
- “What if revenue drops 20% next quarter?”
- “What if we delay AP payments or improve AR collection?”

Common pain points:

- Forecasts live in **Excel** and break when the business changes  
- No unified source of truth for **cash, AR, AP, payroll, and expenses**  
- No robust **scenario modeling** or automated alerts  
- Cash crunches are detected **too late**, when the bank balance is already low  

This project is a **repeatable blueprint** for a cash-flow intelligence system:
> From raw financial data → unified model → forecast → scenarios → alerts → dashboard.

---

## ✨ High-Level Features

1. **Unified Data Layer (Supabase)**
   - Bank transactions, AR invoices, AP bills, payroll, and expenses normalized into **cash events**.
   - Clean schema ready for analytics and dashboards.

2. **Automation Layer (n8n)**
   - Ingestion from:
     - Sample seed data (for demo/testing)
     - External APIs (QuickBooks, Stripe, Gusto, Plaid, etc.)
   - Daily aggregation and forecasting runs.
   - Scenario runner and alerting engine.

3. **Forecasting Engine**
   - Uses historical **cash in/out patterns** and simple heuristics for:
     - 90-day base case forecast
     - Best/worst-case bands
   - Computes **runway** (days until cash crosses threshold or hits zero).

4. **Scenario Modeling**
   - “What-if” adjustments:
     - Revenue growth change (e.g. –20% / +30%)
     - Additional payroll (e.g. hire 5 engineers)
     - Expense cuts or increases in specific categories
   - Each scenario persisted and comparable against baseline.

5. **Runway Alerts**
   - Automatically triggers alerts when:
     - Runway < configured threshold (e.g. 60 days)
     - Worst-case scenario goes negative early
   - Connectable to Slack, email, or other channels.

6. **React Dashboard**
   - Overview of:
     - Historical cash curve
     - 90-day forecast curve
     - Runway metrics & alert banners
   - Scenario comparison:
     - Baseline vs chosen scenario
   - Working capital view:
     - AR & AP aging buckets.

---

## 🏗 Architecture Overview

**Data Flow:**

1. **Data Sources**
   - Sample CSV / SQL seed
   - Accounting (QuickBooks/Xero)
   - Payments (Stripe)
   - Payroll (Gusto, etc.)
   - Banking (Plaid, etc.)

2. **Automation (n8n)**
   - Data Sync workflows pull from APIs → normalize → insert/update Supabase
   - Daily aggregation builds `daily_cash_snapshots`
   - Forecast engine computes 90-day projections into `cash_forecasts`
   - Scenario runner writes `scenario_runs` + scenario forecast deltas
   - Alerting engine scans forecasts and writes `alert_events` + sends Slack/email

3. **Data Warehouse (Supabase)**
   - PostgreSQL database with tables for:
     - Raw events (transactions, invoices, bills, payroll, expenses)
     - Unified cash events
     - Daily snapshots
     - Forecasts & scenarios
     - Alerts

4. **Frontend (React Dashboard)**
   - Connects via Supabase JS client
   - Renders cash curves, KPIs, scenarios, alerts, working capital views.

---

## 📁 Repository Structure

```txt
.
├─ README.md                      # You are here
├─ LICENSE                        # MIT license
├─ .gitignore
├─ .env.example                   # Example environment variables
│
├─ sql/
│  ├─ schema.sql                  # Supabase schema (tables, indexes)
│  ├─ seed_sample_data.sql        # 12+ months of sample cash data
│
├─ n8n/
│  ├─ cashflow_data_sync_supabase.json      # Basic data sync into Supabase
│  ├─ cashflow_aggregation_daily.json       # Aggregates into daily snapshots
│  ├─ cashflow_forecast_engine.json         # 90-day forecast engine
│  ├─ cashflow_scenario_runner.json         # Scenario runner (webhook-triggered)
│  ├─ cashflow_risk_alerts.json             # Runway alerting engine
│  ├─ cashflow_extended_data_sync_apis.json # External API examples (QB/Stripe/etc.)
│
├─ dashboard-react/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ vite.config.ts / next.config.js       # Depending on chosen setup
│  ├─ src/
│  │  ├─ main.tsx / pages/_app.tsx
│  │  ├─ App.tsx
│  │  ├─ lib/
│  │  │  └─ supabaseClient.ts               # Supabase client instance
│  │  ├─ components/
│  │  │  ├─ layout/
│  │  │  │  └─ ShellLayout.tsx              # Top-level layout & navigation
│  │  │  ├─ dashboard/
│  │  │  │  ├─ CashSummaryCards.tsx         # Today cash, runway, net 30d etc.
│  │  │  │  ├─ CashPositionChart.tsx        # Historical + forecast line chart
│  │  │  │  ├─ RiskAlertsPanel.tsx          # Active alerts and runway info
│  │  │  │  └─ ScenarioSwitcher.tsx         # Baseline vs scenario selection
│  │  │  ├─ scenarios/
│  │  │  │  ├─ ScenarioForm.tsx             # Create/update scenario UI
│  │  │  │  └─ ScenarioComparisonChart.tsx  # Baseline vs scenario curves
│  │  │  └─ working-capital/
│  │  │     └─ AgingBucketsChart.tsx        # AR/AP aging view
│  │  └─ pages/ or routes/                  # /, /scenarios, /working-capital, /case-study
│  └─ README.md
│
├─ docs/
│  ├─ 01-overview.md                        # High-level project overview
│  ├─ 02-architecture.md                    # Diagrams and detailed architecture
│  ├─ 03-supabase-setup.md                  # Step-by-step DB setup
│  ├─ 04-n8n-workflows.md                   # Workflow-by-workflow breakdown
│  ├─ 05-external-apis-and-mapping.md       # Provider mapping to tables
│  ├─ 06-dashboard-walkthrough.md           # Screenshots + UI concepts
│  ├─ 07-demo-scripts.md                    # Video / live demo script
│  └─ 08-devto-substack-outline.md          # Article outline for publishing
│
└─ assets/
   ├─ diagrams/
   │  ├─ architecture.png
   │  ├─ data-flow.png
   │  └─ screenshots
