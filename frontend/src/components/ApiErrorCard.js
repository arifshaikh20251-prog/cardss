'use client';

import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  X,
  CreditCard,
  WifiOff,
  Clock,
} from 'lucide-react';

export default function ApiErrorCard({
  title = 'Bank Rail Temporarily Busy - No Funds Deducted',
  message,
  onRetry,
  onDismiss,
  retryLoading = false,
  errorCode = 'GATEWAY_TIMEOUT',
}) {
  const defaultMessage =
    'The upstream banking rail or payment gateway experienced a temporary network latency spike. Rest assured: No funds have been deducted from your account. You may safely retry now.';

  return (
    <div className="rounded-3xl bg-gradient-to-br from-amber-500/[0.08] via-rose-500/[0.05] to-transparent border border-amber-500/30 dark:border-amber-500/40 p-4 sm:p-5 shadow-lg animate-in fade-in space-y-3.5 relative overflow-hidden">
      {/* Top Banner & Status */}
      <div className="flex items-start justify-between space-x-3">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                Safety Guarantee
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                {errorCode}
              </span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
              {title}
            </h4>
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            aria-label="Dismiss error card"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Reassurance Body */}
      <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
        <p>{message || defaultMessage}</p>
        <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Zero-Balance Protection: Your credit card limit was not impacted.</span>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center space-x-2 pt-0.5">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retryLoading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-extrabold shadow-md transition active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retryLoading ? 'animate-spin' : ''}`} />
            <span>{retryLoading ? 'Reconnecting to Rail...' : 'Retry Payment'}</span>
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
