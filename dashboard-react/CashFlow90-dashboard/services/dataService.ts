import { supabase } from './supabaseClient';
import { 
  DailyActual, 
  DailyForecast, 
  AlertEvent, 
  WorkingCapitalSummary, 
  Scenario,
  BankTransaction,
  InvoiceAR,
  BillAP
} from '../types';
import { 
  mockActuals, 
  mockForecasts, 
  mockAlerts, 
  mockWorkingCapital, 
  mockScenarios, 
  mockScenarioForecasts 
} from './mockData';

const DEFAULT_COMPANY_ID = '11111111-1111-1111-1111-111111111111';

// Helper to calculate difference in days
const daysBetween = (d1: Date, d2: Date) => {
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const dataService = {
  /**
   * Gets historical daily cash flow. 
   * Strategy:
   * 1. Check 'daily_actuals' (Processed)
   * 2. Check 'bank_transactions' (Raw) -> Aggregate
   * 3. Fallback to Mock Data
   */
  async getDailyActuals(companyId: string = DEFAULT_COMPANY_ID, days = 90): Promise<DailyActual[]> {
    try {
      // 1. Try fetching pre-computed actuals
      const { data: processedData } = await supabase
        .from('daily_actuals')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: true });

      if (processedData && processedData.length > 0) {
        return processedData;
      }

      // 2. If empty, aggregate from raw Bank Transactions (Client-side ETL)
      console.log('Processed actuals missing, aggregating from raw transactions...');
      const { data: rawTx } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('transaction_date', { ascending: true });

      if (rawTx && rawTx.length > 0) {
        // Group by date
        const txMap = new Map<string, { in: number; out: number }>();
        let minDate = new Date();
        
        rawTx.forEach((tx: BankTransaction) => {
           const d = tx.transaction_date;
           if (new Date(d) < minDate) minDate = new Date(d);
           
           if (!txMap.has(d)) txMap.set(d, { in: 0, out: 0 });
           const entry = txMap.get(d)!;
           
           // Amount is signed in DB (+ inflow, - outflow)
           if (tx.amount >= 0) {
             entry.in += tx.amount;
           } else {
             entry.out += Math.abs(tx.amount);
           }
        });

        // Generate array
        const result: DailyActual[] = [];
        let currentBalance = 50000; // Seed balance for calculation
        
        const sortedDates = Array.from(txMap.keys()).sort();
        
        // Fill gaps roughly
        if (sortedDates.length > 0) {
            const start = new Date(sortedDates[0]);
            const end = new Date();
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const dayTx = txMap.get(dateStr) || { in: 0, out: 0 };
                const net = dayTx.in - dayTx.out;
                const opening = currentBalance;
                currentBalance += net;
                
                result.push({
                    company_id: companyId,
                    date: dateStr,
                    opening_balance: opening,
                    cash_in: dayTx.in,
                    cash_out: dayTx.out,
                    net_cash: net,
                    closing_balance: currentBalance
                });
            }
        }
        return result.slice(-days);
      }
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to mocks', e);
    }

    // 3. Fallback to Mock
    console.log('No DB data found. Using Mock Actuals.');
    return mockActuals;
  },

  /**
   * Gets forecast. 
   * Strategy:
   * 1. Check 'daily_forecasts'
   * 2. Generate Projection from Actuals
   * 3. Fallback to Mock Forecasts
   */
  async getLatestForecast(companyId: string = DEFAULT_COMPANY_ID): Promise<DailyForecast[]> {
    try {
      // 1. Try fetching real forecast run
      const { data: runs } = await supabase
        .from('forecast_runs')
        .select('id')
        .eq('company_id', companyId)
        .eq('run_label', 'baseline')
        .order('run_at', { ascending: false })
        .limit(1);

      if (runs && runs.length > 0) {
        const { data } = await supabase
          .from('daily_forecasts')
          .select('*')
          .eq('run_id', runs[0].id)
          .order('date', { ascending: true });
          
        if (data && data.length > 0) return data;
      }

      // 2. Fallback: Generate Projection from Actuals (if actuals exist in DB)
      // Note: We check if we can get actuals from DB (not mocks)
      const actuals = await this.getDailyActuals(companyId); // This might return mocks though
      
      // Heuristic: If 'actuals' looks like our mock data (checking exact length or specific ID), 
      // we might want to just return mock forecasts to match them perfectly.
      // But let's try to project if we have data.
      
      if (actuals.length > 0) {
        const lastActual = actuals[actuals.length - 1];
        // If the actuals match our mock, return mock forecasts to ensure visual consistency
        if (lastActual.company_id === 'demo-co' && actuals === mockActuals) {
           return mockForecasts;
        }

        // Real data projection logic
        let balance = lastActual.closing_balance;
        const result: DailyForecast[] = [];
        const today = new Date();

        // Simple average burn calculation
        const last30 = actuals.slice(-30);
        const avgBurn = last30.length > 0 ? last30.reduce((acc, curr) => acc + curr.net_cash, 0) / last30.length : 0;
        const projectedDailyNet = avgBurn; 

        for (let i = 1; i <= 90; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            
            balance += projectedDailyNet;
            const volatility = Math.abs(balance * 0.05); 

            result.push({
                run_id: 'generated',
                company_id: companyId,
                date: dateStr,
                base_inflows: 0,
                base_outflows: Math.abs(projectedDailyNet),
                base_net_cash: projectedDailyNet,
                base_closing_balance: balance,
                best_inflows: 0,
                best_outflows: 0,
                best_net_cash: projectedDailyNet,
                best_closing_balance: balance + (volatility * (i/10)),
                worst_inflows: 0,
                worst_outflows: 0,
                worst_net_cash: projectedDailyNet,
                worst_closing_balance: balance - (volatility * (i/10)),
            });
        }
        return result;
      }

    } catch (e) {
      console.warn('Forecast fetch failed', e);
    }

    // 3. Fallback
    return mockForecasts;
  },

  async getScenarioForecast(companyId: string = DEFAULT_COMPANY_ID, scenarioId: string): Promise<DailyForecast[]> {
     // Scenario logic is complex to replicate client-side without the n8n engine.
     // For this dashboard, we will default to the mock scenario data unless strictly defined in DB.
     return mockScenarioForecasts;
  },

  async getAlerts(companyId: string = DEFAULT_COMPANY_ID): Promise<AlertEvent[]> {
    try {
      const { data } = await supabase
        .from('alert_events')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && data.length > 0) return data as AlertEvent[];
    } catch (e) {
       console.warn('Alerts fetch failed', e);
    }
    
    return mockAlerts;
  },

  async getWorkingCapital(companyId: string = DEFAULT_COMPANY_ID): Promise<WorkingCapitalSummary | null> {
    try {
        // 1. Try View
        const { data } = await supabase
          .from('vw_working_capital_summary')
          .select('*')
          .eq('company_id', companyId)
          .limit(1)
          .maybeSingle();

        if (data) return data;

        // 2. Try Aggregation
        const [arRes, apRes] = await Promise.all([
            supabase.from('invoices_ar').select('*').eq('company_id', companyId).neq('status', 'paid').neq('status', 'void'),
            supabase.from('bills_ap').select('*').eq('company_id', companyId).neq('status', 'paid').neq('status', 'void')
        ]);

        if (arRes.data && arRes.data.length > 0) {
           // If we have real invoices, calculate real WC
           const ar: InvoiceAR[] = arRes.data || [];
           const ap: BillAP[] = apRes.data || [];
           const now = new Date();

           const getBucket = (dateStr: string | null) => {
                if (!dateStr) return '0_30';
                const days = daysBetween(new Date(dateStr), now);
                if (days <= 30) return '0_30';
                if (days <= 60) return '31_60';
                if (days <= 90) return '61_90';
                return '90_plus';
            };

            const summary: WorkingCapitalSummary = {
                company_id: companyId,
                as_of_date: now.toISOString(),
                ar_total: 0,
                ap_total: 0,
                ar_0_30: 0, ar_31_60: 0, ar_61_90: 0, ar_90_plus: 0,
                ap_0_30: 0, ap_31_60: 0, ap_61_90: 0, ap_90_plus: 0
            };

            ar.forEach(inv => {
                summary.ar_total += inv.amount;
                // @ts-ignore
                summary[`ar_${getBucket(inv.issue_date)}`] += inv.amount;
            });
            ap.forEach(bill => {
                summary.ap_total += bill.amount;
                 // @ts-ignore
                summary[`ap_${getBucket(bill.issue_date)}`] += bill.amount;
            });
            return summary;
        }
    } catch (e) {
        console.warn('Working capital fetch failed', e);
    }

    return mockWorkingCapital;
  },

  async getScenarios(companyId: string = DEFAULT_COMPANY_ID): Promise<Scenario[]> {
    try {
        const { data } = await supabase
        .from('scenarios')
        .select('*')
        .eq('company_id', companyId);

        if (data && data.length > 0) return data;
    } catch (e) {
        console.warn('Scenarios fetch failed', e);
    }
    return mockScenarios;
  },

  async createScenario(name: string, growth: number, payroll: number): Promise<boolean> {
    // This would typically POST to an n8n webhook
    console.log(`[Simulation] Triggering n8n scenario runner for: ${name}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return true;
  }
};