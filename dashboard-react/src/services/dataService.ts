import type {
  AlertEvent,
  DailyActual,
  DailyForecast,
  Scenario,
  WorkingCapitalSummary,
} from '../types';
import {
  mockActuals,
  mockAlerts,
  mockForecasts,
  mockScenarios,
  mockScenarioForecasts,
  mockWorkingCapital,
} from './mockData';
import { supabase } from './supabaseClient';

const DEFAULT_COMPANY_ID = import.meta.env.VITE_COMPANY_ID || 'demo-co';

export const dataService = {
  async getDailyActuals(
    companyId: string = DEFAULT_COMPANY_ID,
    days = 90,
  ): Promise<DailyActual[]> {
    if (!supabase) return mockActuals.slice(-days);
    const { data, error } = await supabase
      .from('daily_actuals')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: true });
    if (error || !data?.length) return mockActuals.slice(-days);
    return (data as DailyActual[]).slice(-days);
  },

  async getLatestForecast(companyId: string = DEFAULT_COMPANY_ID): Promise<DailyForecast[]> {
    if (!supabase) return mockForecasts;
    const { data: runs, error: runError } = await supabase
      .from('forecast_runs')
      .select('id, as_of_date')
      .eq('company_id', companyId)
      .is('scenario_id', null)
      .order('run_at', { ascending: false })
      .limit(1);
    if (runError || !runs?.length) return mockForecasts;
    const { data, error } = await supabase
      .from('daily_forecasts')
      .select('*')
      .eq('run_id', runs[0].id)
      .order('date', { ascending: true });
    return error || !data?.length ? mockForecasts : (data as DailyForecast[]);
  },

  async getScenarioForecast(
    companyId: string = DEFAULT_COMPANY_ID,
    scenarioId: string,
  ): Promise<DailyForecast[]> {
    if (!supabase) return mockScenarioForecasts;
    const { data: runs } = await supabase
      .from('forecast_runs')
      .select('id')
      .eq('company_id', companyId)
      .eq('scenario_id', scenarioId)
      .order('run_at', { ascending: false })
      .limit(1);
    if (!runs?.length) return [];
    const { data } = await supabase
      .from('daily_forecasts')
      .select('*')
      .eq('run_id', runs[0].id)
      .order('date', { ascending: true });
    return (data as DailyForecast[]) || [];
  },

  async getAlerts(companyId: string = DEFAULT_COMPANY_ID): Promise<AlertEvent[]> {
    if (!supabase) return mockAlerts;
    const { data } = await supabase
      .from('alert_events')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);
    return data?.length ? (data as AlertEvent[]) : mockAlerts;
  },

  async getWorkingCapital(
    companyId: string = DEFAULT_COMPANY_ID,
  ): Promise<WorkingCapitalSummary> {
    if (!supabase) return mockWorkingCapital;
    const { data } = await supabase
      .from('vw_working_capital_summary')
      .select('*')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();
    return (data as WorkingCapitalSummary | null) || mockWorkingCapital;
  },

  async getScenarios(companyId: string = DEFAULT_COMPANY_ID): Promise<Scenario[]> {
    if (!supabase) return mockScenarios;
    const { data } = await supabase
      .from('scenarios')
      .select('*')
      .eq('company_id', companyId);
    return data?.length ? (data as Scenario[]) : mockScenarios;
  },

  async createScenario(name: string, growth: number, payroll: number): Promise<Scenario> {
    return {
      id: `synthetic-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      company_id: 'demo-co',
      name,
      parameters: { growth_adjustment_percent: growth, additional_monthly_payroll: payroll },
      is_default: false,
      evidence_label: 'synthetic',
    };
  },
};
