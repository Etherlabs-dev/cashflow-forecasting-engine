import React, { useEffect, useState } from 'react';
import { Layout } from '../components/ui/Layout';
import { Card, KPICard } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { dataService } from '../services/dataService';
import { WorkingCapitalSummary } from '../types';

export const WorkingCapital = () => {
  const [data, setData] = useState<WorkingCapitalSummary | null>(null);

  useEffect(() => {
    dataService.getWorkingCapital('demo-co').then(setData);
  }, []);

  if (!data) return <Layout>Loading...</Layout>;

  const arData = [
    { name: '0-30 Days', value: data.ar_0_30 },
    { name: '31-60 Days', value: data.ar_31_60 },
    { name: '61-90 Days', value: data.ar_61_90 },
    { name: '90+ Days', value: data.ar_90_plus },
  ];

  const apData = [
    { name: '0-30 Days', value: data.ap_0_30 },
    { name: '31-60 Days', value: data.ap_31_60 },
    { name: '61-90 Days', value: data.ap_61_90 },
    { name: '90+ Days', value: data.ap_90_plus },
  ];

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50">Working Capital</h1>
        <p className="text-slate-400 mt-2">Accounts Receivable & Payable aging analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard label="Total AR (Inflow)" value={formatCurrency(data.ar_total)} trend="Healthy" trendUp={true} />
        <KPICard label="Total AP (Outflow)" value={formatCurrency(data.ap_total)} />
        <KPICard label="Net Working Capital" value={formatCurrency(data.ar_total - data.ap_total)} trend={data.ar_total > data.ap_total ? "Positive" : "Negative"} trendUp={data.ar_total > data.ap_total} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="AR Aging (Inflows)" subtitle="Expected cash collections by urgency">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={arData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tickFormatter={(val) => `$${val/1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} tick={{fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#1e293b'}} 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                    {arData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 3 ? '#ef4444' : index === 2 ? '#f59e0b' : '#10b981'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="AP Aging (Outflows)" subtitle="Pending vendor payments">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={apData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tickFormatter={(val) => `$${val/1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} tick={{fontSize: 12}} />
                <Tooltip 
                   cursor={{fill: '#1e293b'}} 
                   contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} 
                   formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-8 bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
        <h4 className="text-slate-200 font-semibold mb-2">Why this matters</h4>
        <p className="text-slate-400 text-sm">
            Our forecasting engine uses the historical collection patterns from your AR data to probability-weight future cash inflows. 
            If your 60-90 day bucket increases, the engine automatically adjusts future cash probability down by 15% to maintain a conservative forecast.
        </p>
      </div>
    </Layout>
  );
};
