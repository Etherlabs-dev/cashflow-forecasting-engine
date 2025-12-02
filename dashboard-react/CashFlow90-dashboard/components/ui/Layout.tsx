import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Wallet, FileText, ChevronRight, ChevronLeft, PieChart } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const NavItem = ({ to, icon: Icon, label, active, collapsed }: { to: string; icon: any; label: string; active: boolean; collapsed: boolean }) => (
  <Link
    to={to}
    className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
      active
        ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
    }`}
  >
    <Icon size={20} className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'} transition-colors shrink-0`} />
    
    <span 
      className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
        collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'
      }`}
    >
      {label}
    </span>
    
    {/* Hover Tooltip for collapsed state */}
    {collapsed && (
      <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700 transition-opacity">
        {label}
      </div>
    )}
  </Link>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex font-sans selection:bg-primary-500 selection:text-white">
      {/* Sidebar */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 border-r border-slate-800 hidden md:flex flex-col fixed h-full z-10 transition-all duration-300 ease-in-out group/sidebar`}
      >
        {/* Toggle Button - appears on hover */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-full p-1 shadow-lg cursor-pointer z-50 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 focus:opacity-100"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`p-6 border-b border-slate-800 flex flex-col justify-center h-[88px] transition-all duration-300 ${isCollapsed ? 'items-center px-0' : ''}`}>
          <div className="flex items-center gap-2 text-primary-500 overflow-hidden">
            <div className="shrink-0">
               <TrendingUp size={24} strokeWidth={2.5} />
            </div>
            <span className={`text-xl font-bold tracking-tight text-white whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              CashFlow<span className="text-primary-400">90</span>
            </span>
          </div>
          <div className={`mt-2 text-xs text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
            Intelligence Engine
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
          <div className={`text-xs font-semibold text-slate-500 mb-4 px-4 uppercase tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'h-0 opacity-0 mb-0' : 'h-auto opacity-100'}`}>
            Finance
          </div>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} collapsed={isCollapsed} />
          <NavItem to="/scenarios" icon={PieChart} label="Scenarios" active={location.pathname === '/scenarios'} collapsed={isCollapsed} />
          <NavItem to="/working-capital" icon={Wallet} label="Working Capital" active={location.pathname === '/working-capital'} collapsed={isCollapsed} />
          
          <div className={`mt-8 text-xs font-semibold text-slate-500 mb-4 px-4 uppercase tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'h-0 opacity-0 mt-4 mb-0' : 'h-auto opacity-100'}`}>
            Project Info
          </div>
          <NavItem to="/case-study" icon={FileText} label="About & Case Study" active={location.pathname === '/case-study'} collapsed={isCollapsed} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className={`bg-slate-800/50 rounded-lg transition-all duration-300 ${isCollapsed ? 'p-2 flex justify-center' : 'p-3'}`}>
             {isCollapsed ? (
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse my-1" title="System Operational"></div>
             ) : (
                <div className="text-xs text-slate-400 whitespace-nowrap overflow-hidden">
                    <div className="flex items-center gap-2 mb-1 text-slate-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    System Operational
                    </div>
                    Last sync: 2 mins ago
                </div>
             )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'} transition-all duration-300 ease-in-out relative overflow-hidden`}>
        {/* Mobile Header (visible only on small screens) */}
        <div className="md:hidden p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
             <div className="flex items-center gap-2 text-primary-500">
                <TrendingUp size={20} />
                <span className="font-bold text-white">CashFlow90</span>
            </div>
            <div className="flex gap-4">
                 <Link to="/" className="text-sm text-slate-300">Dashboard</Link>
                 <Link to="/case-study" className="text-sm text-slate-300">About</Link>
            </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
};
