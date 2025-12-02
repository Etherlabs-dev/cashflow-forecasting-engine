import React from 'react';
import { Layout } from '../components/ui/Layout';
import { ArrowRight, Database, Workflow, Monitor, Layers } from 'lucide-react';

const TechBlock = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="flex gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="p-3 bg-slate-900 rounded-lg h-fit border border-slate-700 text-primary-400">
            <Icon size={24} />
        </div>
        <div>
            <h4 className="font-semibold text-slate-200 mb-1">{title}</h4>
            <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
        </div>
    </div>
);

export const CaseStudy = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-20">
        {/* Header */}
        <div className="text-center mb-16 pt-8">
            <div className="inline-block px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-xs font-bold uppercase tracking-widest mb-4">
                Technical Case Study
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-50 mb-6 leading-tight">
                How we built a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-emerald-400">90-Day Cash Flow Engine</span> using n8n & Supabase.
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                No more Excel hell. An automated, scenario-capable financial operating system for CFOs.
            </p>
        </div>

        {/* Problem */}
        <section className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-rose-500 pl-4">The Problem: Flying Blind</h2>
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
                <ul className="space-y-4 text-slate-300">
                    <li className="flex gap-3">
                        <span className="text-rose-500 font-bold">•</span>
                        <span><strong>Excel Hell:</strong> Finance teams spend 20h/month manually copy-pasting CSVs from banks into spreadsheets.</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-rose-500 font-bold">•</span>
                        <span><strong>Static Models:</strong> "What if we hire 5 engineers?" requires rebuilding the whole sheet formula chain.</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-rose-500 font-bold">•</span>
                        <span><strong>Lagging Indicators:</strong> Most founders only realize they are low on cash when the bank balance hits zero.</span>
                    </li>
                </ul>
            </div>
        </section>

        {/* Solution & Architecture */}
        <section className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-emerald-500 pl-4">The Solution: Composable Architecture</h2>
            
            <div className="grid md:grid-cols-2 gap-4 mb-8">
                <TechBlock 
                    icon={Workflow} 
                    title="n8n (Automation)" 
                    desc="Orchestrates the ETL pipeline. Fetches daily transactions from Plaid/Stripe, transforms data, runs forecast algorithms, and triggers alerts." 
                />
                <TechBlock 
                    icon={Database} 
                    title="Supabase (Postgres)" 
                    desc="The single source of truth. Stores 'daily_actuals', 'forecast_runs', and 'scenarios'. Row Level Security (RLS) ensures data privacy." 
                />
                 <TechBlock 
                    icon={Monitor} 
                    title="React + Tailwind" 
                    desc="A high-performance dashboard that renders complex time-series data using Recharts. Clean, responsive, and fast." 
                />
                 <TechBlock 
                    icon={Layers} 
                    title="Logic Layer" 
                    desc="Separation of concerns: The UI (React) just displays data. The logic (forecasting math) lives in n8n/Postgres functions." 
                />
            </div>

            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 overflow-x-auto">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider text-center">Data Flow Architecture</h3>
                <div className="flex items-center justify-center min-w-[600px] text-xs font-mono text-slate-300 gap-2">
                    <div className="p-4 border border-dashed border-slate-600 rounded bg-slate-900/50">
                        Banks API<br/>Stripe API<br/>Payroll
                    </div>
                    <ArrowRight className="text-slate-600" />
                    <div className="p-4 border border-primary-500/50 rounded bg-primary-900/10 text-primary-300">
                        <strong className="block mb-2 text-primary-400">n8n Workflow</strong>
                        1. Ingest<br/>2. Normalize<br/>3. Calculate Forecast
                    </div>
                    <ArrowRight className="text-slate-600" />
                    <div className="p-4 border border-emerald-500/50 rounded bg-emerald-900/10 text-emerald-300">
                         <strong className="block mb-2 text-emerald-400">Supabase DB</strong>
                        Table: actuals<br/>Table: forecasts<br/>Table: alerts
                    </div>
                    <ArrowRight className="text-slate-600" />
                    <div className="p-4 border border-indigo-500/50 rounded bg-indigo-900/10 text-indigo-300">
                         <strong className="block mb-2 text-indigo-400">React App</strong>
                        Dashboard<br/>Charts<br/>Scenarios
                    </div>
                </div>
            </div>
        </section>

        {/* Value Prop */}
        <section className="mb-20">
             <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-primary-500 pl-4">Results</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center">
                     <div className="text-3xl font-bold text-white mb-2">90%</div>
                     <div className="text-sm text-slate-400">Less time forecasting</div>
                 </div>
                 <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center">
                     <div className="text-3xl font-bold text-white mb-2">60 Days</div>
                     <div className="text-sm text-slate-400">Earlier warning time</div>
                 </div>
                 <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center">
                     <div className="text-3xl font-bold text-white mb-2">Instant</div>
                     <div className="text-sm text-slate-400">Scenario generation</div>
                 </div>
             </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-b from-slate-900 to-slate-950 p-12 rounded-2xl border border-slate-800">
            <h3 className="text-2xl font-bold text-white mb-4">Want to build this yourself?</h3>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">Check out the open source code or read the deep dive on how we configured the n8n workflows.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#" className="px-6 py-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                    View on GitHub <ArrowRight size={18} />
                </a>
                <a href="#" className="px-6 py-3 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors border border-slate-700">
                    Read Dev.to Article
                </a>
            </div>
        </section>
      </div>
    </Layout>
  );
};
