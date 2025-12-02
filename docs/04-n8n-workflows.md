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

```md
![Data Sync Workflow](../assets/diagrams/n8n-cashflow-data-sync.png)
