'use client';

import React, { useState, useEffect } from 'react';
import { Download, Clock, CheckCircle2, AlertCircle, FileText, Loader2, Mail } from 'lucide-react';
import { formatINR, formatDuration, maskAccount } from '../lib/utils';
import { api } from '../lib/api';

export default function TransactionCard({ transaction }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadingVoucher, setDownloadingVoucher] = useState(false);
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

  const handleDownloadVoucher = async () => {
    setDownloadingVoucher(true);
    try {
      await api.downloadVoucher(transaction.id);
    } catch (err) {
      alert(err.message || 'Failed to download commercial voucher.');
    } finally {
      setDownloadingVoucher(false);
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
    <div className="rounded-2xl bg-white dark:bg-fintech-surface/90 border border-slate-200/90 dark:border-slate-800 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md space-y-3">
      {/* Top Row: Beneficiary and Amount */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[200px]">
            {transaction.beneficiary?.name || 'Vendor Beneficiary'}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {transaction.beneficiary?.bank_name || 'Bank'} •{' '}
            {transaction.beneficiary?.masked_account || maskAccount(transaction.account_number)}
          </p>
        </div>

        <div className="text-right">
          <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
            {formatINR(transaction.amount)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Fee: {formatINR(transaction.platform_fee || transaction.convenience_fee)} + GST
          </span>
        </div>
      </div>

      {/* Middle Row: Status Badge & Live Timer */}
      <div className="flex items-center justify-between pt-1">
        {/* Status Badge */}
        {isCooling ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span>COOLING ({formatDuration(countdown)})</span>
          </div>
        ) : isSuccess ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>PAYOUT SETTLED</span>
          </div>
        ) : isScheduled ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30">
            <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>SCHEDULED (T+1)</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <span>{transaction.status}</span>
          </div>
        )}

        <span className="text-[11px] text-slate-500 font-mono">{formattedDate}</span>
      </div>

      {/* UTR Info (if settled) */}
      {(transaction.payout_utr || transaction.utr_number) && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 px-2.5 py-1.5 flex items-center justify-between text-[11px]">
          <span className="text-slate-600 dark:text-slate-400 font-medium">IMPS UTR:</span>
          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold truncate max-w-[210px]">
            {transaction.payout_utr || transaction.utr_number}
          </span>
        </div>
      )}

      {/* Bottom Action: Download GST Invoice & Resend Email */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] bg-slate-100 text-indigo-700 dark:bg-slate-800/70 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded">
          {transaction.transfer_type || 'STANDARD'} • {transaction.purpose || 'VENDOR_PAYMENT'}
        </span>

        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          {/* Auto-Generated B2B Commercial Voucher Download */}
          {(transaction.voucher_status === 'AUTO_GENERATED' || !transaction.has_external_invoice) && (
            <button
              onClick={handleDownloadVoucher}
              disabled={downloadingVoucher}
              title="Download RBI Commercial Payment Declaration & Settlement Voucher"
              className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 transition flex items-center space-x-1 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-500/30 active:scale-95 disabled:opacity-50"
            >
              {downloadingVoucher ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Voucher...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>B2B Voucher</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleEmailInvoice}
            disabled={emailing}
            title="Send GST Tax Invoice PDF to email"
            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-500/30 active:scale-95 disabled:opacity-50"
          >
            {emailing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Sending...</span>
              </>
            ) : emailSent ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
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
            title="Download SAC 9971 GST Tax Invoice PDF"
            className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition flex items-center space-x-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-300 dark:border-indigo-500/30 active:scale-95 disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                <span>PDF Invoice</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
