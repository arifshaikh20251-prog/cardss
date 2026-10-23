'use client';

import React, { useState } from 'react';
import { formatINR, calculateLiveFee } from '../lib/utils';
import { Info, CheckCircle2, ChevronDown } from 'lucide-react';

export default function FeeBreakdown({ amount, transferType = 'STANDARD', appliedCoupon = null }) {
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const breakdown = calculateLiveFee(amount, transferType);

  if (!amount || parseFloat(amount) <= 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-4 text-center text-slate-500 text-xs">
        Enter a payment amount to preview all-inclusive processing fee.
      </div>
    );
  }

  const effectiveTotal = appliedCoupon ? appliedCoupon.totalPayable : breakdown.totalPayable;
  const effectiveFee = appliedCoupon ? appliedCoupon.totalFee : breakdown.totalFee;

  return (
    <div className="rounded-2xl bg-white dark:bg-fintech-surface/80 border border-slate-200/90 dark:border-slate-800/80 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/60 pb-2.5">
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Payment Breakdown (All-Inclusive)</span>
        </span>
        <span className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-mono px-2 py-0.5 rounded">
          SAC 9971
        </span>
      </div>

      <div className="space-y-2 text-xs">
        {/* Principal Transfer Amount */}
        <div className="flex justify-between text-slate-700 dark:text-slate-300">
          <span>Principal Transfer Amount</span>
          <span className="font-bold text-slate-900 dark:text-white">{formatINR(breakdown.amount)}</span>
        </div>

        {/* Pice / BharatNXT Style All-Inclusive Processing Fee */}
        <div className="flex justify-between text-slate-700 dark:text-slate-300">
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-200 block">
              Processing Fee
            </span>
            <span className="text-[10.5px] text-slate-400 dark:text-slate-500">
              (Inclusive of all taxes & 18% GST)
            </span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white">
            +{formatINR(appliedCoupon ? breakdown.totalFee : effectiveFee)}
          </span>
        </div>

        {/* Promotional Coupon Discount (if applied) */}
        {appliedCoupon && (
          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/70 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
            <span className="flex items-center space-x-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                {appliedCoupon.code}
              </span>
              <span className="text-xs font-bold">Coupon Savings</span>
            </span>
            <span className="font-extrabold text-xs">-{formatINR(appliedCoupon.totalSavings)}</span>
          </div>
        )}

        {/* Net All-Inclusive Processing Fee (if coupon applied) */}
        {appliedCoupon && (
          <div className="flex justify-between text-indigo-700 dark:text-indigo-300 pt-0.5">
            <div>
              <span className="font-semibold block">Net Processing Fee</span>
              <span className="text-[10px] text-indigo-500/80 dark:text-indigo-400/80">
                (Inclusive of all taxes & 18% GST)
              </span>
            </div>
            <span className="font-bold">+{formatINR(effectiveFee)}</span>
          </div>
        )}
      </div>

      {/* Total Charged to Card */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-900 dark:text-white block">Total Charged to Card</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {appliedCoupon ? `Saved ${formatINR(appliedCoupon.totalSavings)} with coupon` : 'No hidden fees or surprise charges'}
          </span>
        </div>
        <div className="text-right">
          {appliedCoupon && (
            <span className="text-xs line-through text-slate-400 block mr-0.5">
              {formatINR(breakdown.totalPayable)}
            </span>
          )}
          <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
            {formatINR(effectiveTotal)}
          </span>
        </div>
      </div>

      {/* Net Payout to Vendor (100% Principal Guarantee) */}
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-emerald-800 dark:text-emerald-300 font-medium text-[11px]">
            Beneficiary receives 100% of principal
          </span>
        </div>
        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
          {formatINR(breakdown.netPayout)}
        </span>
      </div>

      {/* Background SAC 9971 Statutory Accounting Split (For CA & Tax Invoices) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowTaxDetails(!showTaxDetails)}
          className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center space-x-1 transition font-medium"
        >
          <span>Statutory SAC 9971 Tax Split for Accounting</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showTaxDetails ? 'rotate-180' : ''}`} />
        </button>

        {showTaxDetails && (
          <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-[11px] space-y-1 animate-in fade-in-50 text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Platform Base Convenience Fee:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {formatINR(appliedCoupon ? appliedCoupon.netFee : breakdown.platformFee)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Statutory GST (18% under SAC 9971):</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {formatINR(appliedCoupon ? appliedCoupon.gstAmount : breakdown.gstAmount)}
              </span>
            </div>
            <p className="text-[9.5px] text-slate-400 dark:text-slate-500 pt-0.5">
              Certified on Tax Invoices for corporate input tax credit (ITC) claims.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

