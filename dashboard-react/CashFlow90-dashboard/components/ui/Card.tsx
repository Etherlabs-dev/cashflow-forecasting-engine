import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, action }) => {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            {title && <h3 className="text-lg font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export const KPICard: React.FC<{
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean; // true if up is good
  subValue?: string;
}> = ({ label, value, trend, trendUp, subValue }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm hover:border-slate-700 transition-colors">
      <div className="text-sm font-medium text-slate-400 mb-1">{label}</div>
      <div className="text-3xl font-bold text-slate-50 tracking-tight mb-2">{value}</div>
      {(trend || subValue) && (
        <div className="flex items-center gap-2 text-sm">
          {trend && (
            <span
              className={`font-medium px-2 py-0.5 rounded ${
                trendUp
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {trend}
            </span>
          )}
          {subValue && <span className="text-slate-500">{subValue}</span>}
        </div>
      )}
    </div>
  );
};
