import React, { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { AlertTriangle, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { Layout } from '../components/ui/Layout';
import { KPICard, Card } from '../components/ui/Card';
import { dataService } from '../services/dataService';
import { DailyActual, DailyForecast, AlertEvent, ChartDataPoint } from '../types';

export const Dashboard = () => {
  const [actuals, setActuals] = useState<DailyActual[]>([]);
  const [forecasts, setForecasts] = useState<DailyForecast[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [fetchedActuals, fetchedForecasts, fetchedAlerts] = await Promise.all([
        dataService.getDailyActuals('demo-co'),
        dataService.getLatestForecast('demo-co'),
        dataService.getAlerts('demo-co')
      ]);
      setActuals(fetchedActuals);
      setForecasts(fetchedForecasts);
      setAlerts(fetchedAlerts);
      setLoading(false);
    };
    loadData();
  }, []);

  // Process data for chart
  const chartData: ChartDataPoint[] = [
    ...actuals.map(a => ({
      date: a.date,
      actual: a.closing_balance,
      netCash: a.net_cash
    })),
    ...forecasts.map(f => ({
      date: f.date,
      base: f.base_closing_balance,
      best: f.best_closing_balance,
      worst: f.worst_closing_balance
    }))
  ];

  // Calculate KPIs
  const currentCash = actuals.length > 0 ? actuals[actuals.length - 1].closing_balance : 0;
  
  // Find runway
  const zeroDateBase = forecasts.find(f => f.base_closing_balance <= 0)?.date;
  const daysRunwayBase = zeroDateBase 
    ? Math.floor((new Date(zeroDateBase).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : '90+';

  const zeroDateWorst = forecasts.find(f => f.worst_closing_balance <= 0)?.date;
  const daysRunwayWorst = zeroDateWorst 
    ? Math.floor((new Date(zeroDateWorst).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : '90+';

  const next30DayNetCash = forecasts
    .slice(0, 30)
    .reduce((sum, f) => sum + f.base_net_cash, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) return (
    <Layout>
      <div className="flex h-96 items-center justify-center text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-2"></div>
        Loading financial data...
      </div>
    </Layout>
  );

  return (
    <Layout>
      {/* Hero Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Cash Flow Intelligence</h1>
          <p className="text-slate-400 max-w-xl">
            Real-time projection engine. Detect cash crunches <span className="text-primary-400 font-semibold">60 days</span> before they hit.
          </p>
        </div>
        <div className="hidden md:block">
           {/* Abstract visual/mini-chart or decorative element */}
           <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
             <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
             Engine Active
           </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard 
          label="Current Cash Balance" 
          value={formatCurrency(currentCash)}
          trend="+1.2% vs last week"
          trendUp={true}
        />
        <KPICard 
          label="Runway (Base Case)" 
          value={`${daysRunwayBase} Days`}
          subValue="Conservative Estimate"
        />
         <KPICard 
          label="Runway (Worst Case)" 
          value={`${daysRunwayWorst} Days`}
          trend="Critical if < 60d"
          trendUp={daysRunwayWorst === '90+' || Number(daysRunwayWorst) > 60}
        />
        <KPICard 
          label="Next 30-Day Net Cash" 
          value={formatCurrency(next30DayNetCash)}
          trend="Proj. Burn"
          trendUp={next30DayNetCash > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-8">
          <Card title="Cash Forecast (90 Days)" subtitle="Actuals vs Baseline, Best, and Worst Case Scenarios">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    tickFormatter={(str) => {
                      const d = new Date(str);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                    fontSize={12}
                    tickMargin={10}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tickFormatter={(val) => `$${val / 1000}k`}
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <ReferenceLine x={new Date().toISOString().split('T')[0]} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fill: '#f59e0b', fontSize: 12 }} />
                  
                  <Area type="monotone" dataKey="worst" stackId="2" stroke="transparent" fill="transparent" /> 
                  {/* Note: In a real advanced chart we'd use range areas. For simplicity using lines/areas */}
                  
                  <Area type="monotone" name="Actuals" dataKey="actual" stroke="#94a3b8" fill="url(#colorActual)" strokeWidth={2} />
                  <Area type="monotone" name="Base Forecast" dataKey="base" stroke="#0ea5e9" fill="url(#colorBase)" strokeWidth={2} />
                  <Area type="monotone" name="Worst Case" dataKey="worst" stroke="#f43f5e" fill="transparent" strokeDasharray="5 5" strokeWidth={1} />
                  <Area type="monotone" name="Best Case" dataKey="best" stroke="#10b981" fill="transparent" strokeDasharray="5 5" strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs text-slate-400">
                <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-slate-400"></div> Historical</div>
                <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-sky-500"></div> Baseline</div>
                <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-emerald-500 border-dashed border-b border-emerald-500"></div> Best Case</div>
                <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-rose-500 border-dashed border-b border-rose-500"></div> Worst Case</div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
            {/* Alerts Panel */}
            <Card title="Alerts & Insights">
                <div className="space-y-4">
                    {alerts.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            <div className="inline-block p-3 bg-slate-800 rounded-full mb-2"><TrendingUp /></div>
                            <p>All clear – runway looks healthy.</p>
                        </div>
                    )}
                    {alerts.map(alert => (
                        <div key={alert.id} className="flex gap-3 items-start p-3 bg-slate-800/50 rounded-lg border border-slate-800/50">
                            {alert.severity === 'critical' ? (
                                <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                            ) : alert.severity === 'warning' ? (
                                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                            ) : (
                                <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                            )}
                            <div>
                                <p className={`text-sm font-medium ${alert.severity === 'critical' ? 'text-rose-200' : 'text-slate-200'}`}>
                                    {alert.message}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {new Date(alert.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Explainer */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">How this works</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    1. <strong>Ingestion:</strong> n8n connects to your bank, Stripe, and Quickbooks daily.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    2. <strong>Processing:</strong> Transactions are categorized and recurring patterns are detected.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                    3. <strong>Forecasting:</strong> Baseline is generated. Best/Worst cases applied based on your volatility parameters.
                </p>
            </div>
        </div>
      </div>
    </Layout>
  );
};
