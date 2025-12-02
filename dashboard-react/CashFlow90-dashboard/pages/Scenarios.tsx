import React, { useState, useEffect } from 'react';
import { Layout } from '../components/ui/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Play } from 'lucide-react';
import { dataService } from '../services/dataService';
import { DailyForecast, Scenario } from '../types';

export const Scenarios = () => {
  const [activeScenario, setActiveScenario] = useState<string>('baseline');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [baselineData, setBaselineData] = useState<DailyForecast[]>([]);
  const [scenarioData, setScenarioData] = useState<DailyForecast[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [newScenarioName, setNewScenarioName] = useState('');
  const [growthAdj, setGrowthAdj] = useState(0);
  const [payrollAdj, setPayrollAdj] = useState(0);

  useEffect(() => {
    const init = async () => {
      const [sc, base] = await Promise.all([
        dataService.getScenarios('demo-co'),
        dataService.getLatestForecast('demo-co')
      ]);
      setScenarios(sc);
      setBaselineData(base);
    };
    init();
  }, []);

  useEffect(() => {
    const loadScenario = async () => {
      if (activeScenario === 'baseline') {
        setScenarioData([]);
        return;
      }
      const data = await dataService.getScenarioForecast('demo-co', activeScenario);
      setScenarioData(data);
    };
    loadScenario();
  }, [activeScenario]);

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await dataService.createScenario(newScenarioName, growthAdj, payrollAdj);
    
    // Mock updating list
    const newSc: Scenario = {
      id: `new-${Date.now()}`,
      company_id: 'demo-co',
      name: newScenarioName,
      parameters: { growth: growthAdj, payroll: payrollAdj },
      is_default: false
    };
    setScenarios([...scenarios, newSc]);
    setNewScenarioName('');
    setIsCreating(false);
    setLoading(false);
  };

  // Merge data for chart
  const mergedData = baselineData.map((d, i) => {
    const sc = scenarioData[i];
    return {
      date: d.date,
      baseline: d.base_closing_balance,
      scenario: sc ? sc.base_closing_balance : null, // Only exists if scenario selected
    };
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);


  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50">Scenario Planner</h1>
        <p className="text-slate-400 mt-2">Simulate hiring plans, revenue churn, or marketing spend changes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-4 space-y-4">
            <label className="block text-sm font-medium text-slate-300">Compare Forecast</label>
            <div className="space-y-2">
              <button
                onClick={() => setActiveScenario('baseline')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeScenario === 'baseline' 
                    ? 'bg-primary-600 text-white shadow-lg' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Baseline Forecast
              </button>
              {scenarios.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveScenario(s.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeScenario === s.id 
                      ? 'bg-primary-600 text-white shadow-lg' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            
            <div className="pt-4 border-t border-slate-800">
                <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setIsCreating(!isCreating)}
                >
                    <Plus size={16} className="mr-2" /> New Scenario
                </Button>
            </div>
          </Card>

          {isCreating && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl animate-in slide-in-from-top-4 duration-300">
               <h3 className="text-lg font-semibold text-white mb-4">Run Simulation</h3>
               <form onSubmit={handleCreateScenario} className="space-y-4">
                  <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Scenario Name</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="e.g. Q4 Hiring Spree"
                        value={newScenarioName}
                        onChange={e => setNewScenarioName(e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Growth Adjustment (%)</label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="0"
                        value={growthAdj}
                        onChange={e => setGrowthAdj(Number(e.target.value))}
                      />
                  </div>
                   <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Monthly Cost Increase ($)</label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none"
                        placeholder="0"
                        value={payrollAdj}
                        onChange={e => setPayrollAdj(Number(e.target.value))}
                      />
                  </div>
                  <Button type="submit" className="w-full" loading={loading}>
                      <Play size={16} className="mr-2" /> Run Simulation
                  </Button>
               </form>
            </div>
          )}
        </div>

        {/* Chart Area */}
        <div className="lg:col-span-3">
          <Card title="Impact Analysis" subtitle={activeScenario === 'baseline' ? "Select a scenario to compare" : `Comparing Baseline vs ${scenarios.find(s => s.id === activeScenario)?.name}`}>
            <div className="h-[500px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mergedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    tickFormatter={(str) => {
                      const d = new Date(str);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                    fontSize={12}
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
                  <Legend verticalAlign="top" height={36} />
                  <Line 
                    type="monotone" 
                    name="Baseline Forecast" 
                    dataKey="baseline" 
                    stroke="#0ea5e9" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                  {activeScenario !== 'baseline' && (
                    <Line 
                      type="monotone" 
                      name="Selected Scenario" 
                      dataKey="scenario" 
                      stroke="#f59e0b" 
                      strokeWidth={2} 
                      strokeDasharray="5 5" 
                      dot={false} 
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {activeScenario !== 'baseline' && (
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800">
                    <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">Min Cash Delta</div>
                        <div className="text-xl font-bold text-rose-400">-$45,000</div>
                    </div>
                     <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">Runway Impact</div>
                        <div className="text-xl font-bold text-amber-400">-12 Days</div>
                    </div>
                     <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">Break Even</div>
                        <div className="text-xl font-bold text-slate-200">Dec 2024</div>
                    </div>
                </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};
