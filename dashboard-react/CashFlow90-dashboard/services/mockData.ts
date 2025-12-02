import { DailyActual, DailyForecast, AlertEvent, WorkingCapitalSummary, Scenario } from '../types';

// Helper to generate dates relative to today
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
};

const today = new Date();
const PAST_DAYS = 90;
const FUTURE_DAYS = 90;

// Professional Mock Actuals (Historical)
// Simulates a SaaS company with recurring monthly revenue spikes and payroll dips
export const mockActuals: DailyActual[] = Array.from({ length: PAST_DAYS }, (_, i) => {
  const date = addDays(today, -PAST_DAYS + i);
  const dayOfMonth = new Date(date).getDate();
  
  // Base volatility
  let flow = Math.random() * 2000 - 1000;
  
  // Payroll on the 15th and 30th
  if (dayOfMonth === 15 || dayOfMonth === 30) {
    flow -= 45000; 
  }
  
  // Stripe Payouts (Revenue) around the 1st
  if (dayOfMonth === 1 || dayOfMonth === 2) {
    flow += 65000;
  }
  
  // Rent/Infra on the 5th
  if (dayOfMonth === 5) {
    flow -= 8000;
  }

  // Create a growing trend for the balance
  const baseBalance = 120000 + (i * 400); 

  return {
    company_id: 'demo-co',
    date,
    opening_balance: baseBalance,
    cash_in: flow > 0 ? flow : 0,
    cash_out: flow < 0 ? Math.abs(flow) : 0,
    net_cash: flow,
    closing_balance: baseBalance + flow, 
  };
});

// Calculate realistic closing balance for last actual to stitch forecast
const lastActualBalance = mockActuals[mockActuals.length - 1].closing_balance;

// Professional Mock Forecasts
// Baseline: Steady state
// Best Case: +10% Sales
// Worst Case: Churn spike
export const mockForecasts: DailyForecast[] = Array.from({ length: FUTURE_DAYS }, (_, i) => {
  const date = addDays(today, i + 1);
  const dayOfMonth = new Date(date).getDate();
  
  // Projected Burn Logic
  let dailyNet = -500; // Daily operational burn
  
  if (dayOfMonth === 15 || dayOfMonth === 30) dailyNet -= 45000; // Payroll
  if (dayOfMonth === 1) dailyNet += 68000; // Revenue (slightly growing)
  if (dayOfMonth === 5) dailyNet -= 8000; // Infra

  const volatility = 2000; // Uncertainty expands over time
  const uncertainty = i * 150; 

  // Cumulative balances
  // Note: This is a simplified linear approximation for the mock
  const projectedBalance = lastActualBalance + (i * 200); // Slight upward trend in base

  return {
    run_id: 'run-mock-1',
    company_id: 'demo-co',
    date,
    base_inflows: dailyNet > 0 ? dailyNet : 0,
    base_outflows: dailyNet < 0 ? Math.abs(dailyNet) : 0,
    base_net_cash: dailyNet,
    base_closing_balance: projectedBalance + (Math.sin(i * 0.5) * 5000), // Add some wave

    best_inflows: 0,
    best_outflows: 0,
    best_net_cash: dailyNet + 1000,
    best_closing_balance: projectedBalance + (i * 500) + 10000, 

    worst_inflows: 0,
    worst_outflows: 0,
    worst_net_cash: dailyNet - 1000,
    worst_closing_balance: projectedBalance - (i * 800) - 5000, 
  };
});

// Mock Scenario: "Aggressive Hiring Q3"
export const mockScenarioForecasts: DailyForecast[] = mockForecasts.map(f => {
  const diff = daysBetween(new Date(), new Date(f.date));
  // Scenario starts affecting cash in 30 days
  const impact = diff > 30 ? (diff - 30) * -1500 : 0; 
  
  return {
    ...f,
    base_closing_balance: f.base_closing_balance + impact
  };
});

function daysBetween(d1: Date, d2: Date) {
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
}


export const mockAlerts: AlertEvent[] = [
  {
    id: '1',
    company_id: 'demo-co',
    forecast_run_id: 'run-1',
    alert_type: 'runway_below_threshold',
    severity: 'warning',
    message: 'Runway forecast dips below 60 days in Worst Case scenario.',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    company_id: 'demo-co',
    forecast_run_id: 'run-1',
    alert_type: 'large_expense',
    severity: 'info',
    message: 'Large tax payment ($45k) scheduled for next week.',
    created_at: addDays(today, -2),
  },
  {
    id: '3',
    company_id: 'demo-co',
    forecast_run_id: 'run-1',
    alert_type: 'info',
    severity: 'info',
    message: 'Stripe connection re-synced successfully.',
    created_at: addDays(today, -5),
  }
];

export const mockWorkingCapital: WorkingCapitalSummary = {
  company_id: 'demo-co',
  as_of_date: new Date().toISOString(),
  ar_total: 142500,
  ap_total: 48200,
  ar_0_30: 95000,
  ar_31_60: 32000,
  ar_61_90: 10500,
  ar_90_plus: 5000,
  ap_0_30: 38000,
  ap_31_60: 8200,
  ap_61_90: 2000,
  ap_90_plus: 0,
};

export const mockScenarios: Scenario[] = [
  { id: 'sc-1', company_id: 'demo-co', name: 'Hire 5 Engineers (Q3)', parameters: { burn_increase: 75000 }, is_default: false },
  { id: 'sc-2', company_id: 'demo-co', name: 'Reduce Marketing 50%', parameters: { cost_reduction: 0.5 }, is_default: false },
  { id: 'sc-3', company_id: 'demo-co', name: 'Delayed Series B', parameters: { cash_infusion_delay: 90 }, is_default: false },
];