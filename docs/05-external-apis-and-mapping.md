### `docs/05-external-apis-and-mapping.md`


# External APIs & Supabase Mapping

This document describes how external provider data is mapped into the Supabase schema.

It focuses on:

- Which APIs are integrated
- What data is fetched
- How each provider’s fields map into Supabase tables and columns
- Design decisions around idempotency and data lineage

---

## 1. Providers Overview

The **extended data sync workflow** (`cashflow_extended_data_sync_apis.json`) demonstrates integration with:

- **Stripe** – payment charges (cash inflows)
- **QuickBooks** – AR invoices and AP bills
- **Gusto** – payroll runs
- **Plaid** – bank transactions

You can replace or extend these with similar providers (Xero, NetSuite, other payroll or banking APIs).

---

## 2. Common Mapping Concepts

Across all providers we use two important columns for traceability and idempotency:

- `data_source_id` – identifies the provider/source (e.g. “stripe”, “quickbooks”, “plaid-bank-1”).
- `external_id` – the provider’s unique ID for that record (e.g. Stripe `charge.id`, QuickBooks `Invoice.Id`).

The combination `(data_source_id, external_id)` can be used to:

- Upsert safely (no duplicates)
- Track back from a Supabase row to the originating provider record

---

## 3. Stripe → bank_transactions

**API:** `GET /v1/charges`  
**Table:** `bank_transactions`

Stripe charges represent **cash inflows** (or refunds) and are treated like bank receipts.

**Important fields from Stripe:**

- `id` – unique charge ID
- `amount` – integer amount in cents
- `currency` – charge currency
- `created` – Unix timestamp
- `description` – free-text description

**Mapped columns in `bank_transactions`:**

| Supabase Column     | Source                      | Notes                                      |
|---------------------|----------------------------|--------------------------------------------|
| `company_id`        | constant / config          | Your internal company UUID                 |
| `bank_account_id`   | constant / mapping         | Which account this belongs to              |
| `data_source_id`    | `"stripe"` or similar      | Identifies Stripe as the source            |
| `external_id`       | `charge.id`                | Stripe charge ID                           |
| `transaction_date`  | from `created`             | Converted to ISO date                      |
| `amount`            | `charge.amount / 100.0`    | Converted from cents to major unit         |
| `currency`          | `charge.currency`          | Normalised to uppercase (e.g. `USD`)       |
| `description`       | `charge.description`       |                                            |
| `category`          | `"stripe_charge"`          | or more granular category                  |
| `metadata`          | full JSON of `charge`      | Stored as `jsonb` for future use           |

---

## 4. QuickBooks (Invoices) → ar_invoices

**API:** `GET /v3/company/<realmId>/query?query=select * from Invoice`  
**Table:** `ar_invoices`

**Important fields from QuickBooks Invoice:**

- `Id`
- `CustomerRef.value` & `CustomerRef.name`
- `TxnDate` – transaction date
- `DueDate`
- `TotalAmt`
- `CurrencyRef.value`
- `Balance`
- `PrivateNote`

**Mapped columns in `ar_invoices`:**

| Supabase Column   | Source                           | Notes                                      |
|-------------------|----------------------------------|--------------------------------------------|
| `company_id`      | constant / config                | Internal company UUID                      |
| `data_source_id`  | `"quickbooks"`                   | or a more specific ID                      |
| `external_id`     | `Invoice.Id`                     | QBO invoice ID                             |
| `customer_id`     | `Invoice.CustomerRef.value`      |                                            |
| `customer_name`   | `Invoice.CustomerRef.name`       |                                            |
| `issue_date`      | `Invoice.TxnDate`                |                                            |
| `due_date`        | `Invoice.DueDate`                |                                            |
| `amount`          | `Invoice.TotalAmt`               |                                            |
| `currency`        | `Invoice.CurrencyRef.value`      | e.g. `USD`                                 |
| `status`          | computed from `Invoice.Balance`  | e.g. `open` if > 0, else `paid`           |
| `paid_date`       | `NULL` or later logic            | can be filled when payment info is known   |
| `description`     | `Invoice.PrivateNote`            |                                            |
| `metadata`        | full `Invoice` object            |                                            |

---

## 5. QuickBooks (Bills) → ap_bills

**API:** `GET /v3/company/<realmId>/query?query=select * from Bill`  
**Table:** `ap_bills`

**Important fields from QuickBooks Bill:**

- `Id`
- `VendorRef.value` & `VendorRef.name`
- `TxnDate` – issue date
- `DueDate`
- `TotalAmt`
- `CurrencyRef.value`
- `Balance`
- `PrivateNote`

**Mapped columns in `ap_bills`:**

| Supabase Column   | Source                          | Notes                                      |
|-------------------|---------------------------------|--------------------------------------------|
| `company_id`      | constant / config               |                                            |
| `data_source_id`  | `"quickbooks"`                  |                                            |
| `external_id`     | `Bill.Id`                       |                                            |
| `vendor_id`       | `Bill.VendorRef.value`          |                                            |
| `vendor_name`     | `Bill.VendorRef.name`           |                                            |
| `issue_date`      | `Bill.TxnDate`                  |                                            |
| `due_date`        | `Bill.DueDate`                  |                                            |
| `amount`          | `Bill.TotalAmt`                 |                                            |
| `currency`        | `Bill.CurrencyRef.value`        |                                            |
| `status`          | from `Bill.Balance`             | `open` vs `paid`                           |
| `paid_date`       | `NULL` or paid information      |                                            |
| `description`     | `Bill.PrivateNote`              |                                            |
| `metadata`        | full `Bill` object              |                                            |

---

## 6. Gusto (Payroll) → payroll_runs

**API:** `GET /v1/companies/{company_id}/payrolls`  
**Table:** `payroll_runs`

**Important fields from Gusto payroll object (depending on version):**

- `id`
- `pay_period_start_date`
- `pay_period_end_date`
- `check_date` / `pay_date`
- `gross_pay`
- `net_pay`
- `currency`
- `employees_count` / `employee_count`
- `notes`

**Mapped columns in `payroll_runs`:**

| Supabase Column     | Source                               | Notes                       |
|---------------------|--------------------------------------|-----------------------------|
| `company_id`        | constant / config                    |                             |
| `data_source_id`    | `"gusto"`                            |                             |
| `external_id`       | `payroll.id`                         |                             |
| `pay_period_start`  | `payroll.pay_period_start_date`      |                             |
| `pay_period_end`    | `payroll.pay_period_end_date`        |                             |
| `pay_date`          | `payroll.check_date` or `pay_date`   |                             |
| `gross_amount`      | `payroll.gross_pay`                  |                             |
| `net_amount`        | `payroll.net_pay`                    |                             |
| `currency`          | `payroll.currency` (default `USD`)   |                             |
| `employees_count`   | `payroll.employees_count`            |                             |
| `description`       | `payroll.notes`                      |                             |
| `metadata`          | full payroll object                  |                             |

---

## 7. Plaid → bank_transactions

**API:** `POST /transactions/get`  
**Table:** `bank_transactions`

Plaid transactions represent **bank account movements** (debits & credits).

**Important fields from Plaid transaction:**

- `transaction_id`
- `account_id`
- `amount`
- `date`
- `iso_currency_code` / `unofficial_currency_code`
- `name` (full description)
- `transaction_type`
- `category` (array or string)

**Mapped columns in `bank_transactions`:**

| Supabase Column     | Source                               | Notes                                              |
|---------------------|--------------------------------------|----------------------------------------------------|
| `company_id`        | constant / config                    |                                                    |
| `bank_account_id`   | mapping from `account_id`            | Use a lookup or single account for demo           |
| `data_source_id`    | `"plaid"` or `"plaid-<institution>"` |                                                    |
| `external_id`       | `transaction.transaction_id`         |                                                    |
| `transaction_date`  | `transaction.date`                   |                                                    |
| `amount`            | signed amount (in/out logic)         | outflows as negative, inflows as positive         |
| `currency`          | `iso_currency_code` or fallback      |                                                    |
| `description`       | `transaction.name`                   |                                                    |
| `category`          | derived from `transaction.category`  |                                                    |
| `metadata`          | full transaction JSON                |                                                    |

The Code node usually decides the sign of `amount` based on `transaction_type` or rules you define.

---

## 8. Idempotency & Upserts

To avoid duplicate rows when workflows re-run:

1. Use `(data_source_id, external_id)` as the logical unique key.
2. In Supabase:
   - Optionally add a **unique constraint** on `(data_source_id, external_id)` for each table.
3. In n8n:
   - Use an `upsert` or “create or update” pattern:
     - Either via raw SQL using a `Supabase` or `Postgres` node
     - Or by checking for existing records before insert

This ensures re-runs are **safe** and incremental.

---

## 9. Adding New Providers

For each new provider:

1. Identify what type of records you’re pulling:
   - Invoices → `ar_invoices`
   - Bills → `ap_bills`
   - Transactions → `bank_transactions`
   - Payroll → `payroll_runs`
   - Other expenses → `operating_expenses`
2. Create or extend an n8n workflow:
   - HTTP Request node → call provider API.
   - Code node → map fields to Supabase schema.
   - Supabase node → `create` / `upsert` into the right table.
3. Add that provider to:
   - `data_source_id` enumeration
   - Documentation in this file.

---

## 10. Related Docs

- [04-n8n-workflows.md](./04-n8n-workflows.md) – for a step-by-step on the workflows that use these mappings.
- [03-supabase-setup.md](./03-supabase-setup.md) – to understand the tables these APIs feed into.
- [02-architecture.md](./02-architecture.md) – for how providers fit into the bigger system.
