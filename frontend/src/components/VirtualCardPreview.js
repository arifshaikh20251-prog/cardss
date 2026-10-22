'use client';

import React from 'react';
import { Wifi, Zap, Clock, ShieldCheck } from 'lucide-react';
import { formatINR } from '../lib/utils';
import { calculateTotalFromBase } from '../lib/utils';

export default function VirtualCardPreview({
  cardholderName = 'Corporate Cardholder',
  amount = 0,
  transferType = 'INSTANT',
}) {
  const numericAmount = parseFloat(amount || 0);
  const breakdown = calculateTotalFromBase(numericAmount, transferType);

  return (
    <div className="w-full relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-slate-900 via-[#131929] to-[#0A0D14] border border-white/10 shadow-2xl shadow-indigo-950/40 select-none group">
      {/* Iridescent background reflections */}
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/25 transition duration-500" />
      <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent pointer-events-none" />

      {/* Top Row: Chip, Contactless, and Dynamic Fee Badge */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-3">
          {/* Metallic Gold EMV Chip */}
          <div className="w-10 h-8 rounded-lg bg-gradient-to-tr from-amber-300 via-amber-200 to-yellow-400 p-0.5 shadow-md flex items-center justify-center relative overflow-hidden border border-amber-400/40">
            <div className="w-full h-full border border-amber-600/40 rounded flex flex-col justify-between py-1 px-1.5 opacity-70">
              <div className="w-full h-[1px] bg-amber-800/40" />
              <div className="w-full h-[1px] bg-amber-800/40" />
            </div>
          </div>
          {/* Contactless Icon */}
          <Wifi className="w-5 h-5 text-slate-400 rotate-90 opacity-60" />
        </div>

        {/* Dynamic Tier Badge */}
        <div>
          {transferType === 'INSTANT' ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/20">
              <Zap className="w-3 h-3 text-indigo-400 fill-indigo-400" />
              <span>INSTANT • 3.5% FEE</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-800 border border-slate-700 text-slate-300">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>STANDARD • 2.5% FEE</span>
            </span>
          )}
        </div>
      </div>

      {/* Middle Row: Embossed Masked Card Number */}
      <div className="mt-6 mb-4 relative z-10">
        <div className="font-mono text-base sm:text-lg tracking-[0.25em] text-slate-200 font-bold drop-shadow flex items-center space-x-2">
          <span>••••</span>
          <span>••••</span>
          <span>••••</span>
          <span className="text-white font-extrabold">4242</span>
        </div>
      </div>

      {/* Bottom Row: Cardholder Details, Total Payable, and Network Logo */}
      <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/5">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold block">
            Corporate Cardholder
          </span>
          <span className="text-xs font-bold text-white tracking-wide truncate max-w-[170px] block mt-0.5">
            {cardholderName || 'APEX SOLUTIONS PVT LTD'}
          </span>
          <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
            EXP 10/28 • SAC 9971
          </span>
        </div>

        <div className="text-right">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold block">
            Total Card Debit
          </span>
          <span className="text-sm font-black text-emerald-400 font-mono tracking-tight block">
            {formatINR(breakdown?.totalPayable || numericAmount)}
          </span>
          {/* Card Network Logo */}
          <div className="flex items-center justify-end space-x-1 mt-0.5">
            <span className="text-[10px] font-black italic tracking-tighter text-indigo-400">RuPay</span>
            <span className="text-[10px] font-bold text-slate-600">/</span>
            <span className="text-[10px] font-black italic tracking-tighter text-slate-300">VISA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
