'use client';

import React from 'react';
import { formatINR, calculateLiveFee } from '../lib/utils';
import { Info, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function FeeBreakdown({ amount, transferType = 'STANDARD' }) {
  const breakdown = calculateLiveFee(amount, transferType);
  const isInstant = transferType === 'INSTANT';

  if (!amount || parseFloat(amount) <= 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-slate-500 text-xs">
        Enter a payment amount to preview platform fee and 18% GST calculation.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-fintech-surface/80 border border-slate-800/80 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
        <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>Statutory Fee & Tax Breakdown</span>
        </span>
        <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded">
          SAC 9971
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        {/* Principal */}
        <div className="flex justify-between text-slate-300">
          <span>Principal Transfer Amount</span>
          <span className="font-semibold text-white">{formatINR(breakdown.amount)}</span>
        </div>

        {/* Platform Fee */}
        <div className="flex justify-between text-slate-400">
          <span className="flex items-center space-x-1">
            <span>Platform Convenience Fee</span>
            <span className="text-[10px] text-indigo-400 font-medium">
              ({breakdown.feeRate}%)
            </span>
          </span>
          <span className="font-medium text-slate-200">+{formatINR(breakdown.platformFee)}</span>
        </div>

        {/* GST */}
        <div className="flex justify-between text-slate-400">
          <span className="flex items-center space-x-1">
            <span>GST on Convenience Fee</span>
            <span className="text-[10px] text-slate-500 font-medium">(18% on Fee)</span>
          </span>
          <span className="font-medium text-slate-200">+{formatINR(breakdown.gstAmount)}</span>
        </div>

        {/* Total convenience fee */}
        <div className="flex justify-between text-[11px] text-indigo-400/80 pt-0.5">
          <span>Total Convenience Charge (Fee + GST)</span>
          <span className="font-medium">{formatINR(breakdown.totalFee)}</span>
        </div>
      </div>

      {/* Total Card Charge */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white block">Total Charged to Card</span>
          <span className="text-[10px] text-slate-400">Including statutory taxes</span>
        </div>
        <div className="text-right">
          <span className="text-base font-extrabold text-indigo-400 tracking-tight">
            {formatINR(breakdown.totalPayable)}
          </span>
        </div>
      </div>

      {/* Net Payout to Vendor (100% Principal Guarantee) */}
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-emerald-300 font-medium text-[11px]">
            Beneficiary receives 100% of principal
          </span>
        </div>
        <span className="font-bold text-emerald-400 text-xs">
          {formatINR(breakdown.netPayout)}
        </span>
      </div>
    </div>
  );
}
