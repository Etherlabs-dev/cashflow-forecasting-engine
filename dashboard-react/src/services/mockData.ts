import type {
  AlertEvent,
  DailyActual,
  DailyForecast,
  Scenario,
  WorkingCapitalSummary,
} from '../types';

export const DEMO_AS_OF_DATE = '2025-09-30';

const addDays = (value: string, days: number) => {
  const result = new Date(`${value}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};
let actualBalance = 120_000;
export const mockActuals: DailyActual[] = Array.from({ length: 90 }, (_, index) => {
  const date = addDays(DEMO_AS_OF_DATE, index - 89);
  const day = Number(date.slice(-2));
  let netCash = ((index % 7) - 3) * 75;
  if (day === 1) netCash += 65_000;
  if (day === 5) netCash -= 8_000;
  if (day === 15 || day === 30) netCash -= 45_000;
  const opening = actualBalance;
  actualBalance += netCash;
  return {
    company_id: 'demo-co',
    date,
    opening_balance: opening,
    cash_in: Math.max(netCash, 0),
    cash_out: Math.max(-netCash, 0),
    net_cash: netCash,
    closing_balance: actualBalance,
    currency: 'USD',
    evidence_label: 'synthetic',
  };
});

let baseBalance = actualBalance;
let bestBalance = actualBalance;
let worstBalance = actualBalance;
export const mockForecasts: DailyForecast[] = Array.from({ length: 90 }, (_, index) => {
  const date = addDays(DEMO_AS_OF_DATE, index + 1);
  const day = Number(date.slice(-2));
  let netCash = -500;
  if (day === 1) netCash += 68_000;
  if (day === 5) netCash -= 8_000;
  if (day === 15 || day === 30) netCash -= 45_000;
  const bestNet = netCash >= 0 ? netCash * 1.1 : netCash * 0.95;
  const worstNet = netCash >= 0 ? netCash * 0.8 : netCash * 1.1;
  baseBalance += netCash;
  bestBalance += bestNet;
  worstBalance += worstNet;
  return {
    run_id: 'synthetic-baseline-2025-09-30',
    company_id: 'demo-co',
    date,
    base_inflows: Math.max(netCash, 0),
    base_outflows: Math.max(-netCash, 0),
    base_net_cash: netCash,
    base_closing_balance: baseBalance,
    best_inflows: Math.max(bestNet, 0),
    best_outflows: Math.max(-bestNet, 0),
    best_net_cash: bestNet,
    best_closing_balance: bestBalance,
    worst_inflows: Math.max(worstNet, 0),
    worst_outflows: Math.max(-worstNet, 0),
    worst_net_cash: worstNet,
    worst_closing_balance: worstBalance,
    forecast_as_of_date: DEMO_AS_OF_DATE,
    currency: 'USD',
    evidence_label: 'synthetic',
  };
});

export const mockScenarioForecasts: DailyForecast[] = mockForecasts.map((forecast, index) => ({
  ...forecast,
  run_id: 'synthetic-hiring-scenario',
  base_closing_balance:
    forecast.base_closing_balance - (index >= 30 ? (index - 29) * 1_500 : 0),
}));

export const mockAlerts: AlertEvent[] = [
  {
    id: 'synthetic-alert-1',
    company_id: 'demo-co',
    forecast_run_id: 'synthetic-baseline-2025-09-30',
    alert_type: 'runway_threshold_demo',
    severity: 'info',
    message: 'Synthetic example: threshold monitoring is enabled for the frozen demo run.',
    created_at: `${DEMO_AS_OF_DATE}T12:00:00Z`,
    evidence_label: 'synthetic',
  },
];

export const mockWorkingCapital: WorkingCapitalSummary = {
  company_id: 'demo-co',
  as_of_date: DEMO_AS_OF_DATE,
  ar_total: 142_500,
  ap_total: 48_200,
  ar_0_30: 95_000,
  ar_31_60: 32_000,
  ar_61_90: 10_500,
  ar_90_plus: 5_000,
  ap_0_30: 38_000,
  ap_31_60: 8_200,
  ap_61_90: 2_000,
  ap_90_plus: 0,
};

export const mockScenarios: Scenario[] = [
  {
    id: 'synthetic-hiring',
    company_id: 'demo-co',
    name: 'Synthetic hiring scenario',
    parameters: { additional_monthly_payroll: 45_000 },
    is_default: false,
    evidence_label: 'synthetic',
  },
];
