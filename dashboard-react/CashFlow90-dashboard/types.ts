export interface DailyActual {
  company_id: string;
  date: string; // YYYY-MM-DD
  opening_balance: number;
  cash_in: number;
  cash_out: number;
  net_cash: number;
  closing_balance: number;
}

export interface ForecastRun {
  id: string;
  company_id: string;
  scenario_id: string | null;
  parameters_id: string | null;
  run_label: string;
  run_at: string;
  assumptions: Record<string, any>;
}

export interface DailyForecast {
  run_id: string;
  company_id: string;
  date: string;
  base_inflows: number;
  base_outflows: number;
  base_net_cash: number;
  base_closing_balance: number;
  best_inflows: number;
  best_outflows: number;
  best_net_cash: number;
  best_closing_balance: number;
  worst_inflows: number;
  worst_outflows: number;
  worst_net_cash: number;
  worst_closing_balance: number;
  metadata?: Record<string, any>;
}

export interface Scenario {
  id: string;
  company_id: string;
  name: string;
  parameters: Record<string, any>;
  is_default: boolean;
}

export interface WorkingCapitalSummary {
  company_id: string;
  as_of_date: string;
  ar_total: number;
  ap_total: number;
  ar_0_30: number;
  ar_31_60: number;
  ar_61_90: number;
  ar_90_plus: number;
  ap_0_30: number;
  ap_31_60: number;
  ap_61_90: number;
  ap_90_plus: number;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertEvent {
  id: string;
  company_id: string;
  forecast_run_id: string;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  details?: Record<string, any>;
  created_at: string;
}

// Helper type for charts
export interface ChartDataPoint {
  date: string;
  actual?: number;
  base?: number;
  best?: number;
  worst?: number;
  scenarioBase?: number;
  netCash?: number;
}

// Raw Database Types (for client-side aggregation if needed)
export interface BankTransaction {
  id: string;
  company_id: string;
  transaction_date: string;
  amount: number;
  direction: 'in' | 'out';
  description: string;
  category: string;
}

export interface InvoiceAR {
  id: string;
  company_id: string;
  issue_date: string;
  due_date: string | null;
  amount: number;
  status: 'draft' | 'open' | 'paid' | 'void' | 'overdue' | 'cancelled';
  customer_name: string;
}

export interface BillAP {
  id: string;
  company_id: string;
  issue_date: string;
  due_date: string | null;
  amount: number;
  status: 'draft' | 'open' | 'paid' | 'void' | 'overdue' | 'cancelled';
  vendor_name: string;
}
