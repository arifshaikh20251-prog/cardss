'use client';

import React from 'react';
import { formatINR, calculateLiveFee } from '../lib/utils';
import { Info, CheckCircle2 } from 'lucide-react';

export default function FeeBreakdown({ amount, transferType = 'STANDARD', appliedCoupon = null }) {
  const breakdown = calculateLiveFee(amount, transferType);

  if (!amount || parseFloat(amount) <= 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-4 text-center text-slate-500 text-xs">
        Enter a payment amount to preview platform fee and 18% GST calculation.
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
          <span>Statutory Fee & Tax Breakdown</span>
        </span>
        <span className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-mono px-2 py-0.5 rounded">
          SAC 9971
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        {/* Principal */}
        <div className="flex justify-between text-slate-700 dark:text-slate-300">
          <span>Principal Transfer Amount</span>
          <span className="font-bold text-slate-900 dark:text-white">{formatINR(breakdown.amount)}</span>
        </div>

        {/* Platform Fee */}
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span className="flex items-center space-x-1">
            <span>Platform Convenience Fee</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              ({breakdown.feeRate}%)
            </span>
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            +{formatINR(appliedCoupon ? appliedCoupon.originalFee : breakdown.platformFee)}
          </span>
        </div>

        {/* Promotional Coupon Discount (if applied) */}
        {appliedCoupon && (
          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/70 dark:bg-emerald-950/40 px-2 py-1 rounded-lg">
            <span className="flex items-center space-x-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                {appliedCoupon.code}
              </span>
              <span className="text-xs">Coupon Discount</span>
            </span>
            <span className="font-bold">-{formatINR(appliedCoupon.discountAmount)}</span>
          </div>
        )}

        {/* Net Platform Fee (if coupon applied) */}
        {appliedCoupon && (
          <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Net Fee (after coupon discount)</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              +{formatINR(appliedCoupon.netFee)}
            </span>
          </div>
        )}

        {/* GST */}
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span className="flex items-center space-x-1">
            <span>GST on Convenience Fee</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {appliedCoupon ? '(18% on Net Fee)' : '(18% on Fee)'}
            </span>
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            +{formatINR(appliedCoupon ? appliedCoupon.gstAmount : breakdown.gstAmount)}
          </span>
        </div>

        {/* Total convenience fee */}
        <div className="flex justify-between text-[11px] text-indigo-700 dark:text-indigo-400/90 pt-0.5">
          <span>Total Convenience Charge (Fee + GST)</span>
          <span className="font-semibold">{formatINR(effectiveFee)}</span>
        </div>
      </div>

      {/* Total Card Charge */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-900 dark:text-white block">Total Charged to Card</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {appliedCoupon ? `Saved ${formatINR(appliedCoupon.totalSavings)} with coupon` : 'Including statutory taxes'}
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
    </div>
  );
}
