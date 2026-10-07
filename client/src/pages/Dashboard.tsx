import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FileSpreadsheet, Bot, TrendingUp, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="mt-2 text-primary-foreground/80 font-light max-w-xl">
            You are signed into InsightNexus foundation node. Start setting up your organization dashboard or customize your user preferences.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/profile"
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary-foreground text-primary hover:bg-slate-50 transition-colors shadow"
          >
            Manage Profile
          </Link>
          <Link
            to="/settings"
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-500/30 text-primary-foreground hover:bg-indigo-500/40 border border-primary-foreground/20 transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-500 text-sm flex gap-3 items-start">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">System Status: Foundation Operational</span>
          <p className="mt-1 text-xs text-blue-500/80">
            This dashboard layout and structural routing are ready for future phases. AI engines, Document ingestion pipeline, and Interactive Chart panels will load when enabled.
          </p>
        </div>
      </div>

      {/* Grid Quick Navigation Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between h-48">
          <div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg">Document Management</h3>
            <p className="text-sm text-muted-foreground mt-1">Upload and organize spreadsheets, scanned invoices, or financial reports.</p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-secondary text-secondary-foreground self-start mt-4">
            Coming Soon
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between h-48">
          <div>
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-4">
              <Bot className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg">AI Analytics Chat</h3>
            <p className="text-sm text-muted-foreground mt-1">Query database structures and schemas using natural English conversations.</p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-secondary text-secondary-foreground self-start mt-4">
            Coming Soon
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between h-48">
          <div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg">Forecasting Engine</h3>
            <p className="text-sm text-muted-foreground mt-1">Predict future metrics for revenue, demand patterns, or material costs.</p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-secondary text-secondary-foreground self-start mt-4">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
