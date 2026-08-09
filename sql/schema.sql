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
  run_label         text not null,         -- "daily_auto", "manual_hiring_5_engs"
  run_at            timestamptz not null default now(),
  as_of_date        date not null,         -- frozen knowledge boundary for this forecast
  source_watermark  timestamptz not null,  -- freshest source record included in the run
  assumptions       jsonb not null,        -- full immutable assumption snapshot
  assumptions_fingerprint text not null check (assumptions_fingerprint ~ '^[0-9a-f]{64}$'),
  scenario_snapshot jsonb not null default '{}'::jsonb,
  model_version     text not null,
  input_status      text not null default 'ready'
                    check (input_status in ('ready', 'degraded', 'blocked')),
  created_by        text,                  -- 'system' or email/user id
  notes             text
);

create index if not exists idx_forecast_runs_company_run_at
  on forecast_runs (company_id, run_at desc);

create unique index if not exists uq_forecast_run_identity
  on forecast_runs (
    company_id,
    coalesce(scenario_id, '00000000-0000-0000-0000-000000000000'::uuid),
    as_of_date,
    assumptions_fingerprint
  );


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
  dedupe_key      text not null,
  lifecycle_status text not null default 'active'
                  check (lifecycle_status in ('active', 'resolved')),
  severity        alert_severity not null default 'warning',
  message         text not null,
  details         jsonb,                   -- includes computed runway, dates, etc.
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  check ((lifecycle_status = 'resolved') = (resolved_at is not null))
);

create index if not exists idx_alert_events_company_created
  on alert_events (company_id, created_at desc);

create unique index if not exists uq_active_alert_dedupe
  on alert_events (company_id, dedupe_key)
  where lifecycle_status = 'active';

-- Backtests compare a frozen forecast with later realized cash. A row is evidence
-- of an executed comparison, not a claim of production forecast accuracy.
create table if not exists forecast_backtests (
  id                    uuid primary key default gen_random_uuid(),
  forecast_run_id       uuid not null references forecast_runs(id) on delete cascade,
  evaluated_through     date not null,
  observation_count     integer not null check (observation_count > 0),
  metrics               jsonb not null,
  evidence_label        text not null check (evidence_label in ('synthetic_backtest', 'historical_backtest')),
  realized_fingerprint  text not null check (realized_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at            timestamptz not null default now(),
  unique (forecast_run_id, evaluated_through, realized_fingerprint)
);

-- Transactional boundary used by the n8n orchestration workflows. Replaying an
-- identical service response is safe because the run identity and daily rows
-- are upserted rather than duplicated.
create or replace function persist_forecast_result(payload jsonb)
returns uuid
language plpgsql
as $$
declare
  run_payload jsonb := payload->'run';
  row_payload jsonb;
  persisted_run_id uuid := (run_payload->>'id')::uuid;
begin
  insert into forecast_runs (
    id, company_id, scenario_id, run_label, run_at, as_of_date,
    source_watermark, assumptions, assumptions_fingerprint,
    scenario_snapshot, model_version, input_status, created_by
  ) values (
    persisted_run_id,
    (run_payload->>'company_id')::uuid,
    nullif(run_payload->>'scenario_id', '')::uuid,
    run_payload->>'run_label',
    (run_payload->>'run_at')::timestamptz,
    (run_payload->>'as_of_date')::date,
    (run_payload->>'source_watermark')::timestamptz,
    run_payload->'assumptions',
    run_payload->>'assumptions_fingerprint',
    coalesce(run_payload->'scenario_snapshot', '{}'::jsonb),
    run_payload->>'model_version',
    coalesce(run_payload->>'input_status', 'ready'),
    'forecast-service'
  ) on conflict (id) do nothing;

  for row_payload in select value from jsonb_array_elements(payload->'daily_forecasts')
  loop
    insert into daily_forecasts (
      run_id, company_id, date, base_inflows, base_outflows, base_net_cash,
      base_closing_balance, best_inflows, best_outflows, best_net_cash,
      best_closing_balance, worst_inflows, worst_outflows, worst_net_cash,
      worst_closing_balance, metadata
    ) values (
      persisted_run_id, (row_payload->>'company_id')::uuid, (row_payload->>'date')::date,
      (row_payload->>'base_inflows')::numeric, (row_payload->>'base_outflows')::numeric,
      (row_payload->>'base_net_cash')::numeric, (row_payload->>'base_closing_balance')::numeric,
      (row_payload->>'best_inflows')::numeric, (row_payload->>'best_outflows')::numeric,
      (row_payload->>'best_net_cash')::numeric, (row_payload->>'best_closing_balance')::numeric,
      (row_payload->>'worst_inflows')::numeric, (row_payload->>'worst_outflows')::numeric,
      (row_payload->>'worst_net_cash')::numeric, (row_payload->>'worst_closing_balance')::numeric,
      coalesce(row_payload->'metadata', '{}'::jsonb)
    ) on conflict (run_id, date) do nothing;
  end loop;
  return persisted_run_id;
end
$$;

-- Claims only previously unseen active threshold breaches. Repeated schedule
-- runs therefore do not send the same notification again.
create or replace function claim_cashflow_alerts()
returns setof alert_events
language sql
as $$
  with latest_runs as (
    select distinct on (company_id) *
    from forecast_runs
    where input_status = 'ready'
    order by company_id, as_of_date desc, run_at desc
  ), breaches as (
    select
      r.company_id,
      r.id as forecast_run_id,
      'runway_below_threshold'::text as alert_type,
      'runway:' || r.id::text || ':base' as dedupe_key,
      min(f.date) as breach_date
    from latest_runs r
    join daily_forecasts f on f.run_id = r.id
    where f.base_closing_balance <= coalesce((r.assumptions->>'runway_threshold')::numeric, 0)
    group by r.company_id, r.id
  ), inserted as (
    insert into alert_events (
      company_id, forecast_run_id, alert_type, dedupe_key, severity, message, details
    )
    select
      company_id, forecast_run_id, alert_type, dedupe_key, 'warning',
      'Base forecast crosses the configured runway threshold on ' || breach_date,
      jsonb_build_object('breach_date', breach_date)
    from breaches
    on conflict (company_id, dedupe_key) where lifecycle_status = 'active' do nothing
    returning *
  )
  select * from inserted;
$$;

-- ==========================================================
-- END OF SCHEMA
-- ==========================================================
