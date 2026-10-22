'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  ShieldAlert, 
  HelpCircle, 
  X, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  ShieldCheck,
  AlertTriangle 
} from 'lucide-react';
import { formatINR, formatDuration } from '../lib/utils';
import Link from 'next/link';

export default function CoolingBanner({ transactions = [] }) {
  // Find first active cooling transaction
  const coolingTx = transactions.find((t) => t.status === 'IN_COOLING' && t.cooling_release_at);

  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    if (!coolingTx?.cooling_release_at) return 0;
    const diff = Math.floor((new Date(coolingTx.cooling_release_at).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const [isWhyDelayedOpen, setIsWhyDelayedOpen] = useState(false);

  useEffect(() => {
    if (!coolingTx?.cooling_release_at) return;

    const calculateRemaining = () => {
      const diff = Math.floor((new Date(coolingTx.cooling_release_at).getTime() - Date.now()) / 1000);
      setRemainingSeconds(Math.max(0, diff));
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [coolingTx?.cooling_release_at]);

  if (!coolingTx || remainingSeconds <= 0) return null;

  // Calculate circular progress based on 24-hour total window (86400 seconds)
  const totalWindowSeconds = 24 * 3600;
  const elapsed = Math.max(0, totalWindowSeconds - remainingSeconds);
  const progressPercent = Math.min(100, Math.max(0, (elapsed / totalWindowSeconds) * 100));
  const strokeDashoffset = 100 - progressPercent;

  return (
    <>
      <div className="mb-4 rounded-3xl bg-gradient-to-r from-amber-50/90 via-amber-100/50 to-orange-50/60 dark:from-[#1E1308] dark:via-[#16120C] dark:to-slate-900 border border-amber-200/90 dark:border-amber-500/40 p-4 shadow-sm dark:shadow-xl dark:shadow-amber-950/40 relative overflow-hidden group transition-all">
        {/* Revolut-style neon ambient blur */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-400/10 dark:bg-amber-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/25 transition duration-500" />

        <div className="flex items-start space-x-3.5 relative z-10">
          {/* Circular countdown ring */}
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 36 36">
              {/* Background Ring */}
              <path
                className="text-amber-200/70 dark:text-amber-950/60"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Animated Progress Ring */}
              <path
                className="text-amber-600 dark:text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] transition-all duration-1000 ease-linear"
                strokeDasharray="100, 100"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 absolute animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header Tag */}
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-ping" />
                <span>AML Security Hold Active</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {Math.round(progressPercent)}% elapsed
              </span>
            </div>

            {/* Countdown Micro-copy */}
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 leading-snug">
              {formatINR(coolingTx.amount)} auto-releases in{' '}
              <span className="text-amber-700 dark:text-amber-400 font-mono tracking-tight underline decoration-amber-500/50">
                {formatDuration(remainingSeconds)}
              </span>
            </h4>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              Auto-releases to Beneficiary in {formatDuration(remainingSeconds)} via automated IMPS settlement rail.
            </p>

            {/* Actions: Why delayed drawer trigger + View details */}
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-500/20">
              <button
                type="button"
                onClick={() => setIsWhyDelayedOpen(true)}
                className="text-[11px] text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-200 font-bold flex items-center space-x-1 transition active:scale-95"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Why is my payment delayed?</span>
              </button>

              <Link
                href="/transactions"
                className="text-[10px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold flex items-center space-x-1 transition"
              >
                <span>Live Status</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* "Why Is My Payment Delayed?" Modal / Bottom Sheet */}
      {isWhyDelayedOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 dark:bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#111622] border-t sm:border border-slate-200 dark:border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Why is my payout delayed?</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">RBI AML Regulations & Escrow Protection</p>
                </div>
              </div>
              <button
                onClick={() => setIsWhyDelayedOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation Body */}
            <div className="mt-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 space-y-1">
                <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center space-x-1.5">
                  <Clock className="w-4 h-4" />
                  <span>1. 24-Hour Card Cooling Window</span>
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  To safeguard corporate cardholders against velocity abuse, the first transaction initiated on any newly added card is held under a 24-hour statutory cooling-off window.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 space-y-1">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>2. Anti-Money Laundering (PMLA) Safeguards</span>
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  UtilityPay strictly enforces anti-self-transfer rules to prevent personal credit card cycling. All payees undergo ₹1 penny-drop validation against bank IFSC records.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 space-y-1">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1.5">
                  <Lock className="w-4 h-4" />
                  <span>3. 100% Escrow & Zero-Chargeback Guarantee</span>
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Your funds are securely held in an RBI-monitored nodal escrow account. Once the timer completes, our automated settlement engine executes the IMPS payout directly into your payee’s bank account.
                </p>
              </div>
            </div>

            {/* Confirmation Action */}
            <button
              onClick={() => setIsWhyDelayedOpen(false)}
              className="mt-5 w-full py-3 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-glow transition active:scale-95"
            >
              Understood & Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
