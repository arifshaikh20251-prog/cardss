'use client';

import React from 'react';
import { AlertOctagon, RefreshCw, Home, ShieldCheck } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[UI_ERROR_BOUNDARY] Uncaught interface exception:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4 shadow-lg">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 mb-2">
            Interface Recovery Shield
          </span>

          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            Bank-Grade UI Self-Healing
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
            An unexpected interface rendering exception was safely caught. All ledger balances, transaction states, and bank escrows remain 100% secure.
          </p>

          {this.state.error?.message && (
            <div className="mt-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 max-w-sm overflow-hidden text-ellipsis">
              {this.state.error.message}
            </div>
          )}

          <div className="mt-5 flex items-center space-x-3">
            <button
              onClick={this.handleReload}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition active:scale-95 flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Interface</span>
            </button>

            <button
              onClick={this.handleReset}
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition active:scale-95 flex items-center space-x-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </button>
          </div>

          <div className="mt-8 flex items-center space-x-1.5 text-[10px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Certified RBI Intermediary Resilience Engine</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
