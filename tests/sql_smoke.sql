begin;

insert into companies (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Synthetic SQL fixture');

select persist_forecast_result($json$
{
  "run": {
    "id": "22222222-2222-2222-2222-222222222222",
    "company_id": "11111111-1111-1111-1111-111111111111",
    "scenario_id": null,
    "run_label": "baseline",
    "run_at": "2025-02-01T00:00:00Z",
    "as_of_date": "2025-01-31",
    "source_watermark": "2025-01-31T23:00:00Z",
    "assumptions": {"runway_threshold": "0"},
    "assumptions_fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "scenario_snapshot": {},
    "model_version": "deterministic-v1",
    "input_status": "ready"
  },
  "daily_forecasts": [{
    "company_id": "11111111-1111-1111-1111-111111111111",
    "date": "2025-02-01",
    "base_inflows": "0", "base_outflows": "10", "base_net_cash": "-10", "base_closing_balance": "-10",
    "best_inflows": "0", "best_outflows": "9.5", "best_net_cash": "-9.5", "best_closing_balance": "-9.5",
    "worst_inflows": "0", "worst_outflows": "11", "worst_net_cash": "-11", "worst_closing_balance": "-11",
    "metadata": {}
  }]
}
$json$::jsonb);

-- Exact replays do not duplicate either the run or its daily row.
select persist_forecast_result($json$
{
  "run": {
    "id": "22222222-2222-2222-2222-222222222222", "company_id": "11111111-1111-1111-1111-111111111111",
    "scenario_id": null, "run_label": "baseline", "run_at": "2025-02-01T00:00:00Z", "as_of_date": "2025-01-31",
    "source_watermark": "2025-01-31T23:00:00Z", "assumptions": {"runway_threshold": "0"},
    "assumptions_fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "scenario_snapshot": {}, "model_version": "deterministic-v1", "input_status": "ready"
  },
  "daily_forecasts": [{
    "company_id": "11111111-1111-1111-1111-111111111111", "date": "2025-02-01",
    "base_inflows": "0", "base_outflows": "10", "base_net_cash": "-10", "base_closing_balance": "-10",
    "best_inflows": "0", "best_outflows": "9.5", "best_net_cash": "-9.5", "best_closing_balance": "-9.5",
    "worst_inflows": "0", "worst_outflows": "11", "worst_net_cash": "-11", "worst_closing_balance": "-11", "metadata": {}
  }]
}
$json$::jsonb);

do $$
begin
  if (select count(*) from forecast_runs) <> 1 or (select count(*) from daily_forecasts) <> 1 then
    raise exception 'forecast persistence is not idempotent';
  end if;
end $$;

select * from claim_cashflow_alerts();
select * from claim_cashflow_alerts();

do $$
begin
  if (select count(*) from alert_events) <> 1 then
    raise exception 'alert claim is not deduplicated';
  end if;
end $$;

rollback;
