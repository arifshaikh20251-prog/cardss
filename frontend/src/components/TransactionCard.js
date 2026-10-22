'use client';

import React, { useState, useEffect } from 'react';
import { Download, Clock, CheckCircle2, AlertCircle, ArrowUpRight, FileText, Loader2, Mail } from 'lucide-react';
import { formatINR, formatDuration, maskAccount } from '../lib/utils';
import { api } from '../lib/api';

export default function TransactionCard({ transaction }) {
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(() => {
    if (!transaction.cooling_release_at) return 0;
    const diff = Math.floor((new Date(transaction.cooling_release_at).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (transaction.status !== 'IN_COOLING' || !transaction.cooling_release_at) return;

    const timer = setInterval(() => {
      const diff = Math.floor((new Date(transaction.cooling_release_at).getTime() - Date.now()) / 1000);
      setCountdown(Math.max(0, diff));
    }, 1000);

    return () => clearInterval(timer);
  }, [transaction.status, transaction.cooling_release_at]);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      await api.downloadInvoice(transaction.id);
    } catch (err) {
      alert(err.message || 'Failed to download invoice.');
    } finally {
      setDownloading(false);
    }
  };

  const handleEmailInvoice = async () => {
    setEmailing(true);
    try {
      await api.sendEmailInvoice(transaction.id);
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3500);
    } catch (err) {
      alert(err.message || 'Failed to send invoice via email.');
    } finally {
      setEmailing(false);
    }
  };

  const isCooling = transaction.status === 'IN_COOLING';
  const isSuccess = transaction.status === 'PAYOUT_SUCCESS';
  const isScheduled = transaction.status === 'PAYOUT_SCHEDULED';

  const formattedDate = new Date(transaction.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="rounded-2xl bg-fintech-surface/90 border border-slate-800 p-4 transition hover:border-slate-700 space-y-3">
      {/* Top Row: Beneficiary and Amount */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h4 className="font-bold text-sm text-white truncate max-w-[200px]">
            {transaction.beneficiary?.name || 'Vendor Beneficiary'}
          </h4>
          <p className="text-[11px] text-slate-400">
            {transaction.beneficiary?.bank_name || 'Bank'} •{' '}
            {transaction.beneficiary?.masked_account || maskAccount(transaction.account_number)}
          </p>
        </div>

        <div className="text-right">
          <span className="font-extrabold text-sm text-white block">
            {formatINR(transaction.amount)}
          </span>
          <span className="text-[10px] text-slate-400">
            Fee: {formatINR(transaction.platform_fee || transaction.convenience_fee)} + GST
          </span>
        </div>
      </div>

      {/* Middle Row: Status Badge & Live Timer */}
      <div className="flex items-center justify-between pt-1">
        {/* Status Badge */}
        {isCooling ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>COOLING ({formatDuration(countdown)})</span>
          </div>
        ) : isSuccess ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>PAYOUT SETTLED</span>
          </div>
        ) : isScheduled ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>SCHEDULED (T+1)</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <span>{transaction.status}</span>
          </div>
        )}

        <span className="text-[11px] text-slate-500 font-mono">{formattedDate}</span>
      </div>

      {/* UTR Info (if settled) */}
      {(transaction.payout_utr || transaction.utr_number) && (
        <div className="rounded-xl bg-slate-900/90 border border-slate-800/80 px-2.5 py-1.5 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">IMPS UTR:</span>
          <span className="font-mono text-emerald-400 font-semibold truncate max-w-[210px]">
            {transaction.payout_utr || transaction.utr_number}
          </span>
        </div>
      )}

      {/* Bottom Action: Download GST Invoice & Resend Email */}
      <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] bg-slate-800/70 text-indigo-400 font-semibold px-2 py-0.5 rounded">
          {transaction.transfer_type || 'STANDARD'} • {transaction.purpose || 'VENDOR_PAYMENT'}
        </span>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleEmailInvoice}
            disabled={emailing}
            title="Send GST Tax Invoice PDF to email"
            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition flex items-center space-x-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 active:scale-95 disabled:opacity-50"
          >
            {emailing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Sending...</span>
              </>
            ) : emailSent ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Sent!</span>
              </>
            ) : (
              <>
                <Mail className="w-3 h-3" />
                <span>Email Invoice</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadInvoice}
            disabled={downloading}
            className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center space-x-1 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/30 active:scale-95 disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                <span>PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
