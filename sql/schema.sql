-- ==========================================================
-- CASH FLOW INTELLIGENCE – SUPABASE SCHEMA
-- ==========================================================
-- Assumes PostgreSQL (Supabase default)
-- ==========================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$
begin
  -- Direction of cash movement
  if not exists (select 1 from pg_type where typname = 'transaction_direction') then
    create type transaction_direction as enum ('in', 'out');
  end if;

  -- Status of AR invoices
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('draft', 'open', 'paid', 'void', 'overdue', 'cancelled');
  end if;

  -- Status of AP bills
  if not exists (select 1 from pg_type where typname = 'bill_status') then
    create type bill_status as enum ('draft', 'open', 'paid', 'void', 'overdue', 'cancelled');
  end if;

  -- Severity for alerts
  if not exists (select 1 from pg_type where typname = 'alert_severity') then
    create type alert_severity as enum ('info', 'warning', 'critical');
  end if;
end
$$;

-- ==========================================================
-- 1. CORE MULTI-TENANT TABLES
-- ==========================================================

-- Companies / clients using the system
create table if not exists companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  default_currency char(3) not null default 'USD',
  timezone        text not null default 'UTC',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- External data sources (Stripe, QuickBooks, Xero, banks, etc.)
create table if not exists data_sources (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  name            text not null,          -- e.g. "Stripe Main", "QuickBooks US"
  provider        text not null,          -- e.g. 'stripe', 'quickbooks', 'xero', 'plaid', 'bank_csv'
  connection_info jsonb,                  -- opaque config: account ids, env, etc. (no secrets)
  status          text not null default 'active', -- 'active', 'disabled', 'error'
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_data_sources_company
  on data_sources (company_id);

-- To track high-level sync runs per data source (for debugging & observability)
create table if not exists sync_logs (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  data_source_id  uuid references data_sources(id) on delete set null,
  workflow_name   text not null,          -- n8n workflow identifier
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running', -- 'running', 'success', 'failed'
  error_message   text
);

create index if not exists idx_sync_logs_company_started
  on sync_logs (company_id, started_at desc);


-- ==========================================================
-- 2. BANKS & TRANSACTIONS
-- ==========================================================

-- Bank / cash accounts
create table if not exists bank_accounts (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  data_source_id  uuid references data_sources(id) on delete set null, -- optional link to Plaid/bank connector
  external_id     text,                    -- bank account ID from provider
  name            text not null,           -- "Operating Account", "Stripe Payout Wallet"
  institution     text,                    -- "Chase", "Stripe", etc.
  currency        char(3) not null default 'USD',
  account_mask    text,                    -- e.g. last 4 digits
  is_primary      boolean not null default false,
  created_at      timestamptz not null default now(),

  unique (company_id, external_id)
);

create index if not exists idx_bank_accounts_company
  on bank_accounts (company_id);

-- Raw bank / cash transactions (fundamental for daily actuals)
create table if not exists bank_transactions (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  bank_account_id   uuid references bank_accounts(id) on delete set null,
  data_source_id    uuid references data_sources(id) on delete set null,
  external_id       text,                  -- transaction id in upstream system
  transaction_date  date not null,
  posted_at         timestamptz,           -- when it actually posted
  amount            numeric(18,2) not null, -- signed; + = inflow, - = outflow
  currency          char(3) not null default 'USD',
  direction         transaction_direction generated always as (
                     case when amount >= 0 then 'in'::transaction_direction
                          else 'out'::transaction_direction
                     end
                   ) stored,
  description       text,
  category          text,                  -- category tagging logic can live in n8n later
  metadata          jsonb,                 -- raw payload, labels, tags
  created_at        timestamptz not null default now(),

  unique (company_id, external_id, data_source_id)
);

create index if not exists idx_bank_tx_company_date
  on bank_transactions (company_id, transaction_date);

create index if not exists idx_bank_tx_account_date
  on bank_transactions (bank_account_id, transaction_date);


-- ==========================================================
-- 3. ACCOUNTS RECEIVABLE (AR) – INVOICES
-- ==========================================================

create table if not exists invoices_ar (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  data_source_id  uuid references data_sources(id) on delete set null,
  external_id     text,                    -- invoice id in upstream system
  customer_id     text,                    -- upstream customer identifier
  customer_name   text,
  issue_date      date not null,
  due_date        date,
  amount          numeric(18,2) not null,
  currency        char(3) not null default 'USD',
  status          invoice_status not null default 'open',
  paid_date       date,
  description     text,
  metadata        jsonb,
  created_at      timestamptz not null default now(),

  unique (company_id, external_id, data_source_id)
);

create index if not exists idx_invoices_ar_company_status
  on invoices_ar (company_id, status);

create index if not exists idx_invoices_ar_company_due
  on invoices_ar (company_id, due_date);

create index if not exists idx_invoices_ar_company_issue
  on invoices_ar (company_id, issue_date);


-- ==========================================================
-- 4. ACCOUNTS PAYABLE (AP) – BILLS
-- ==========================================================

create table if not exists bills_ap (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  data_source_id  uuid references data_sources(id) on delete set null,
  external_id     text,                    -- bill id in upstream system
  vendor_id       text,
  vendor_name     text,
  issue_date      date not null,
  due_date        date,
  amount          numeric(18,2) not null,
  currency        char(3) not null default 'USD',
  status          bill_status not null default 'open',
  paid_date       date,
  description     text,
  metadata        jsonb,
  created_at      timestamptz not null default now(),

  unique (company_id, external_id, data_source_id)
);

create index if not exists idx_bills_ap_company_status
  on bills_ap (company_id, status);

create index if not exists idx_bills_ap_company_due
  on bills_ap (company_id, due_date);

create index if not exists idx_bills_ap_company_issue
  on bills_ap (company_id, issue_date);


-- ==========================================================
-- 5. PAYROLL & RECURRING EXPENSES
-- ==========================================================

-- High-level payroll runs (we don't need every employee’s row for cashflow)
create table if not exists payroll_runs (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  data_source_id  uuid references data_sources(id) on delete set null,
  external_id     text,                    -- payroll batch id in upstream system
  pay_period_start date,
  pay_period_end   date,
  pay_date         date not null,
  gross_amount     numeric(18,2),
  net_amount       numeric(18,2) not null,
  currency         char(3) not null default 'USD',
  employees_count  integer,
  description      text,
  metadata         jsonb,
  created_at       timestamptz not null default now(),

  unique (company_id, external_id, data_source_id)
);

create index if not exists idx_payroll_runs_company_pay_date
  on payroll_runs (company_id, pay_date);

-- Recurring expenses (SaaS, rent, etc.) for deterministic forecast components
create table if not exists recurring_expenses (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  vendor          text not null,
  description     text,
  category        text,                      -- 'SaaS', 'Rent', 'Infra', etc.
  amount          numeric(18,2) not null,
  currency        char(3) not null default 'USD',
  frequency       text not null,             -- 'monthly', 'weekly', 'yearly', 'custom'
  interval_count  integer not null default 1, -- every X units of frequency
  day_of_month    smallint,                  -- for monthly patterns (1–31)
  day_of_week     smallint,                  -- 0–6 if weekly (Sun–Sat)
  next_charge_date date,
  is_active       boolean not null default true,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_recurring_expenses_company_active
  on recurring_expenses (company_id, is_active);

-- ==========================================================
-- 6. DAILY ACTUALS (HISTORICAL CASH FLOWS)
-- ==========================================================

-- Derived from bank_transactions; one row per company per day
create table if not exists daily_actuals (
  company_id       uuid not null references companies(id) on delete cascade,
  date             date not null,
  opening_balance  numeric(18,2),          -- optional; can be calculated
  cash_in          numeric(18,2) not null default 0,
  cash_out         numeric(18,2) not null default 0,
  net_cash         numeric(18,2) not null default 0,
  closing_balance  numeric(18,2),          -- cumulative
  metadata         jsonb,                  -- debug info if needed
  created_at       timestamptz not null default now(),

  primary key (company_id, date)
);

create index if not exists idx_daily_actuals_company_date
  on daily_actuals (company_id, date);


-- ==========================================================
-- 7. PARAMETERS / MODEL STATE
-- ==========================================================

-- Aggregated parameters that the forecasting engine uses
create table if not exists cashflow_parameters (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  calculated_at         timestamptz not null default now(),
  base_growth_rate      numeric(10,6),      -- e.g. 0.050000 = 5% monthly growth
  ar_distribution       jsonb,              -- e.g. buckets: { "0-15": 0.5, "16-30": 0.3, "31-60": 0.2 }
  ap_distribution       jsonb,
  seasonality_factors   jsonb,              -- by month or week: { "1": 1.1, "2": 0.95, ... }
  burn_rate_metrics     jsonb,              -- summary of average burn, volatility, etc.
  extra_metrics         jsonb               -- any extra derived params
);

create index if not exists idx_cashflow_parameters_company_calc
  on cashflow_parameters (company_id, calculated_at desc);


-- ==========================================================
-- 8. SCENARIOS & FORECAST RUNS
-- ==========================================================

-- Saved “what-if” scenarios (hire 5 people, growth slows 20%, etc.)
create table if not exists scenarios (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  name              text not null,         -- "Base Case", "Hire 5 engineers", "Growth -20%"
  description       text,
  parameters        jsonb not null,        -- knobs: extra payroll, growth adjustments, AR/AP tweaks
  is_default        boolean not null default false,
  created_by        text,                  -- email or user id (for now just a string)
  created_at        timestamptz not null default now()
);

create index if not exists idx_scenarios_company
  on scenarios (company_id);

-- Forecast runs: one per execution of the forecast engine
create table if not exists forecast_runs (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  scenario_id       uuid references scenarios(id) on delete set null,
  parameters_id     uuid references cashflow_parameters(id) on delete set null,
  run_label         text,                  -- "daily_auto", "manual_hiring_5_engs"
  run_at            timestamptz not null default now(),
  assumptions       jsonb,                 -- full snapshot of assumptions for traceability
  created_by        text,                  -- 'system' or email/user id
  notes             text
);

create index if not exists idx_forecast_runs_company_run_at
  on forecast_runs (company_id, run_at desc);


-- ==========================================================
-- 9. DAILY FORECASTS
-- ==========================================================

-- Per day forecast values for base / best / worst scenarios
create table if not exists daily_forecasts (
  run_id                 uuid not null references forecast_runs(id) on delete cascade,
  company_id             uuid not null references companies(id) on delete cascade,
  date                   date not null,

  base_inflows           numeric(18,2) not null default 0,
  base_outflows          numeric(18,2) not null default 0,
  base_net_cash          numeric(18,2) not null default 0,
  base_closing_balance   numeric(18,2),

  best_inflows           numeric(18,2) not null default 0,
  best_outflows          numeric(18,2) not null default 0,
  best_net_cash          numeric(18,2) not null default 0,
  best_closing_balance   numeric(18,2),

  worst_inflows          numeric(18,2) not null default 0,
  worst_outflows         numeric(18,2) not null default 0,
  worst_net_cash         numeric(18,2) not null default 0,
  worst_closing_balance  numeric(18,2),

  metadata               jsonb,            -- debug per-day assumptions if needed
  created_at             timestamptz not null default now(),

  primary key (run_id, date)
);

create index if not exists idx_daily_forecasts_company_date
  on daily_forecasts (company_id, date);

create index if not exists idx_daily_forecasts_run_company
  on daily_forecasts (company_id, run_id);


-- ==========================================================
-- 10. ALERTS
-- ==========================================================

-- Alert events generated from forecast outputs (runway < X days, etc.)
create table if not exists alert_events (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  forecast_run_id uuid references forecast_runs(id) on delete set null,
  alert_type      text not null,           -- 'runway_below_threshold', 'negative_balance', etc.
  severity        alert_severity not null default 'warning',
  message         text not null,
  details         jsonb,                   -- includes computed runway, dates, etc.
  created_at      timestamptz not null default now()
);

create index if not exists idx_alert_events_company_created
  on alert_events (company_id, created_at desc);

-- ==========================================================
-- END OF SCHEMA
-- ==========================================================
