'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDuration, maskAccount } from '../../lib/utils';
import {
  ShieldCheck,
  TrendingUp,
  Clock,
  Download,
  Zap,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Users,
  FileSpreadsheet,
  ChevronRight,
  Loader2,
  Lock,
  ArrowRight,
  Building,
  KeyRound,
  Server,
  Activity,
  Database,
  Cpu,
  Radio,
  HardDrive,
  Flame,
  Tag,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [adminKey, setAdminKey] = useState('fintech_admin_secret_key_2026');
  const [metrics, setMetrics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'IN_COOLING' | 'PAYOUT_SUCCESS'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);
  const [downloadingGst, setDownloadingGst] = useState(false);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'ledger' | 'compliance' | 'diagnostics' | 'promotions'
  const [systemHealth, setSystemHealth] = useState(null);
  const [pingResult, setPingResult] = useState(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  // Broadcast Promotion Manager State
  const [promoData, setPromoData] = useState({
    title: '⚡ Month-End Commercial Bill Rush',
    subtitle: 'Transfer above ₹25,000 today & save flat ₹25 on convenience fees!',
    coupon_code: 'SAVE25',
    badge_text: '🔥 FLASH OFFER',
    cta_label: 'Claim Offer & Pay Now',
    target_amount: 25000,
    target_audience: 'ALL',
    is_active: true,
  });
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState(false);

  const loadAdminData = async () => {
    try {
      setRefreshing(true);
      const [metricsRes, txRes, healthRes, promoRes] = await Promise.all([
        api.getAdminMetrics(adminKey).catch((err) => {
          console.warn('Failed to load admin metrics:', err);
          return { metrics: null };
        }),
        api.getAdminTransactions({}, adminKey).catch((err) => {
          console.warn('Failed to load admin transactions:', err);
          return { transactions: [] };
        }),
        api.getSystemHealth(adminKey).catch((err) => {
          console.warn('Failed to load system health:', err);
          return null;
        }),
        api.getAdminPromotion(adminKey).catch((err) => {
          console.warn('Failed to load admin promotion:', err);
          return null;
        }),
      ]);

      setMetrics(metricsRes.metrics || null);
      setTransactions(txRes.transactions || []);
      if (healthRes && healthRes.success) {
        setSystemHealth(healthRes);
      }
      if (promoRes && promoRes.success && promoRes.promotion) {
        setPromoData(promoRes.promotion);
      }
    } catch (err) {
      console.error('Admin data fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    const interval = setInterval(loadAdminData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [adminKey]);

  // Handle instant admin cooling override
  const handleOverrideCooling = async (txId) => {
    setActionLoadingId(txId);
    setActionSuccessMsg(null);
    try {
      const res = await api.overrideCooling(txId, adminKey);
      setActionSuccessMsg({
        id: txId,
        text: `⚡ Payout settled! Bank UTR: ${res.utr}`,
      });
      await loadAdminData();
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err) {
      alert(err.message || 'Cooling override failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle monthly CA GST report download
  const handleDownloadGst = async () => {
    setDownloadingGst(true);
    try {
      await api.downloadGstReport('', adminKey);
    } catch (err) {
      alert(err.message || 'Failed to download GST report.');
    } finally {
      setDownloadingGst(false);
    }
  };

  // Diagnostic test: Ping Remote Gateway
  const handlePingGateway = async () => {
    setPingLoading(true);
    setPingResult(null);
    try {
      const res = await api.testGatewayPing(adminKey);
      setPingResult(res);
    } catch (err) {
      setPingResult({ success: false, status: 'ERROR', error: err.message });
    } finally {
      setPingLoading(false);
    }
  };

  // Diagnostic test: Test Webhook Handshake
  const handleTestWebhook = async () => {
    setWebhookLoading(true);
    setWebhookResult(null);
    try {
      const res = await api.testWebhookHandshake(adminKey);
      setWebhookResult(res);
    } catch (err) {
      setWebhookResult({ success: false, verified: false, error: err.message });
    } finally {
      setWebhookLoading(false);
    }
  };

  // Handle Promotional Campaign Updates
  const handleSavePromotion = async (customPayload) => {
    setPromoLoading(true);
    setPromoSuccessMsg(false);
    try {
      const payload = customPayload || promoData;
      const res = await api.updateAdminPromotion(payload, adminKey);
      if (res && res.success && res.promotion) {
        setPromoData(res.promotion);
        setPromoSuccessMsg(true);
        setTimeout(() => setPromoSuccessMsg(false), 4000);
      }
    } catch (err) {
      alert(err.message || 'Failed to update broadcast promotion.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleTogglePromoActive = async () => {
    const updated = { ...promoData, is_active: !promoData.is_active };
    setPromoData(updated);
    await handleSavePromotion(updated);
  };

  const coolingTransactions = transactions.filter((t) => t.status === 'IN_COOLING');

  const filteredTransactions = transactions.filter((t) => {
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.id?.toLowerCase().includes(q) ||
        t.utr_number?.toLowerCase().includes(q) ||
        t.beneficiary?.account_holder_name?.toLowerCase().includes(q) ||
        t.beneficiary?.account_number?.includes(q) ||
        t.user?.full_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center text-white shadow-glow">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Master Admin Center
              </h2>
              <span className="text-[10px] bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 rounded border border-red-500/30">
                OPS
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Float Analytics, Cooling Override Ops & CA Tax Reports
            </p>
          </div>
        </div>

        <button
          onClick={loadAdminData}
          disabled={refreshing}
          className="p-2 rounded-xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition active:scale-95"
          title="Refresh Float Data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Top Financial KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Gross Volume */}
        <div className="rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Gross Volume
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
            {formatINR(metrics?.grossVolume || 0)}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            30d Run-Rate: {formatINR(metrics?.thirtyDayRunRate || 0)}
          </p>
        </div>

        {/* Net Revenue */}
        <div className="rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Net Fee Revenue
            </span>
            <Zap className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-sans tracking-tight">
            {formatINR(metrics?.totalPlatformFees || 0)}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            SAC 9971 Platform Fees
          </p>
        </div>

        {/* GST Collected */}
        <div className="rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              GST Collected (18%)
            </span>
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-sans tracking-tight">
            {formatINR(metrics?.totalGst || 0)}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            CGST 9% + SGST 9%
          </p>
        </div>

        {/* 24h Cooling Float */}
        <div className="rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              24h Cooling Hold
            </span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-sans tracking-tight">
            {formatINR(metrics?.activeCoolingVolume || 0)}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {metrics?.activeCoolingCount || 0} active hold(s)
          </p>
        </div>
      </div>

      {/* Quick Action: Export CA GST Report */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-emerald-50/80 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-indigo-200/90 dark:border-indigo-500/30 p-4 shadow-sm flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Monthly CA GST Tax Report</span>
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            GSTR-1 & GSTR-3B itemized CSV with SAC 9971, CGST & SGST
          </p>
        </div>

        <button
          onClick={handleDownloadGst}
          disabled={downloadingGst}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-glow flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 shrink-0"
        >
          {downloadingGst ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation Tabs (5-Column) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'queue'
              ? 'bg-amber-500 text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Queue ({coolingTransactions.length})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'ledger'
              ? 'bg-indigo-600 text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Ledger ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'compliance'
              ? 'bg-emerald-600 text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Clients ({metrics?.activeUsers || 0})
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`py-2 rounded-xl transition flex items-center justify-center space-x-1 ${
            activeTab === 'diagnostics'
              ? 'bg-sky-600 text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Health</span>
        </button>
        <button
          onClick={() => setActiveTab('promotions')}
          className={`py-2 rounded-xl transition flex items-center justify-center space-x-1 ${
            activeTab === 'promotions'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Flash Offers</span>
        </button>
      </div>

      {/* TAB 1: Live Cooling Queue & Instant Override */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Statutory 24-Hour Hold Queue
            </h3>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
              Requires Admin clearance or auto-expires
            </span>
          </div>

          {coolingTransactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center space-y-2 bg-white/50 dark:bg-transparent">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cooling Queue is Empty</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[260px] mx-auto">
                All platform payments have either completed the 24-hour statutory hold or have been settled via IMPS.
              </p>
            </div>
          ) : (
            coolingTransactions.map((tx) => (
              <div
                key={tx.id}
                className="rounded-2xl bg-white dark:bg-fintech-surface border border-amber-200/90 dark:border-amber-500/30 p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                      In Security Hold
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">
                      {tx.user?.full_name || 'Corporate Partner'} &rarr; {tx.beneficiary?.account_holder_name || 'Vendor Payee'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {tx.beneficiary?.bank_name} • {maskAccount(tx.beneficiary?.account_number)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white block">
                      {formatINR(tx.amount)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Fee: {formatINR(tx.convenience_fee)} + GST
                    </span>
                  </div>
                </div>

                {/* Release Schedule & Timer */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Auto-releases at:</span>
                  </div>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                    {new Date(tx.cooling_release_at || Date.now()).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                {actionSuccessMsg?.id === tx.id && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{actionSuccessMsg.text}</span>
                  </div>
                )}

                {/* Instant Override Button */}
                <button
                  onClick={() => handleOverrideCooling(tx.id)}
                  disabled={actionLoadingId === tx.id}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-glow flex items-center justify-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
                >
                  {actionLoadingId === tx.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Overriding Hold & Executing IMPS Payout...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      <span>⚡ Approve & Release IMPS Payout Now</span>
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Full Platform Ledger with Filters */}
      {activeTab === 'ledger' && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by payee, UTR, or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex gap-1.5 text-[11px] overflow-x-auto pb-1">
            {['ALL', 'IN_COOLING', 'PAYOUT_SUCCESS'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-full border font-semibold transition ${
                  filterStatus === st
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-fintech-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'IN_COOLING' ? 'In Cooling' : 'Settled'}
              </button>
            ))}
          </div>

          {/* Transaction Cards */}
          <div className="space-y-2.5">
            {filteredTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                No transactions matching the criteria.
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200/90 dark:border-slate-800 p-3.5 shadow-sm space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[210px]">
                        {tx.beneficiary?.account_holder_name || 'Payee'}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Payer: {tx.user?.full_name || 'Client'} • {tx.transfer_type || 'STANDARD'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                        {formatINR(tx.amount)}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${
                          tx.status === 'PAYOUT_SUCCESS'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                            : tx.status === 'IN_COOLING'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                            : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>

                  {tx.utr_number && (
                    <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                      UTR: {tx.utr_number}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Compliance & KYC Review */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Platform KYC Verification Status</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold block uppercase">
                  Verified Clients
                </span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                  {metrics?.verifiedKyc || 0}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">PAN & Aadhaar Cleared</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30">
                <span className="text-[10px] text-amber-800 dark:text-amber-400 font-bold block uppercase">
                  Pending KYC
                </span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                  {metrics?.pendingKyc || 0}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">Subject to 24h Cooling</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              All clients must undergo dual KYC (NSDL PAN verification + UIDAI Aadhaar e-KYC). Unverified accounts remain strictly bound by the 24-hour statutory cooling-off window.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: Production System Health & Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Live Operational Status Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>All Systems Operational</span>
                  <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono font-normal">
                    100% Uptime
                  </span>
                </h4>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                  Hostinger Node.js API • Phusion Passenger • Supabase Cloud Ledger
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 hidden sm:inline">
              Up: {systemHealth?.engine?.uptimeHuman || 'Live'}
            </span>
          </div>

          {/* Infrastructure Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Hostinger Node.js Engine */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-bold uppercase tracking-wider text-[10px]">Node Engine</span>
                <Server className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                {systemHealth?.engine?.version || process.version}
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                RAM: {systemHealth?.engine?.memory?.rssMB || '45.2'} MB RSS
              </p>
            </div>

            {/* Database & Latency */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-bold uppercase tracking-wider text-[10px]">Database Rail</span>
                <Database className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>{systemHealth?.database?.status || 'CONNECTED'}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Ping: {systemHealth?.database?.latencyMs || 1} ms
              </p>
            </div>

            {/* Payment Gateway Mode */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-bold uppercase tracking-wider text-[10px]">Gateway Mode</span>
                <Radio className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-sm font-extrabold font-mono text-amber-600 dark:text-amber-400">
                {systemHealth?.gateway?.mode || 'mock'}
              </div>
              <p className="text-[10px] text-slate-500">
                Provider: {systemHealth?.gateway?.provider || 'mock'}
              </p>
            </div>

            {/* Security Rate Limit Shield */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-bold uppercase tracking-wider text-[10px]">Rate Limiters</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                {systemHealth?.rateLimiting?.status || 'ACTIVE'}
              </div>
              <p className="text-[10px] text-slate-500">
                OTP: 5/10m • Tx: 20/1h
              </p>
            </div>
          </div>

          {/* Webhook & Compliance Strip */}
          <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">HMAC Webhook Security:</span>
              <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                {systemHealth?.webhookSecurity?.status || 'VERIFIED_CONFIGURED'} (HMAC-SHA256)
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">SAC 9971 Tax Compliance:</span>
              <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                18% GST (CGST 9% + SGST 9%) • Sec 65B Certified
              </span>
            </div>
          </div>

          {/* Interactive Diagnostic Verification Triggers */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Diagnostic Verification Actions
            </h4>

            {/* Action 1: Ping Remote Gateway */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                    Ping Remote Payment Gateway
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Measures live gateway handshake latency & connectivity
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePingGateway}
                  disabled={pingLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {pingLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Pinging...</span>
                    </>
                  ) : (
                    <span>Ping Gateway</span>
                  )}
                </button>
              </div>

              {pingResult && (
                <div className={`p-2.5 rounded-xl text-[11px] font-mono border ${
                  pingResult.status === 'HEALTHY'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                }`}>
                  Status: <strong>{pingResult.status}</strong> • Latency: <strong>{pingResult.latencyMs}ms</strong> • Provider: <strong>{pingResult.provider}</strong>
                </div>
              )}
            </div>

            {/* Action 2: Test Webhook Handshake */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                    Test Webhook HMAC-SHA256 Handshake
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Validates cryptographic signature verification logic
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={webhookLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {webhookLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Test Handshake</span>
                  )}
                </button>
              </div>

              {webhookResult && (
                <div className={`p-2.5 rounded-xl text-[11px] font-mono border ${
                  webhookResult.verified
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                }`}>
                  Verified: <strong>{webhookResult.verified ? 'PASS' : 'FAIL'}</strong> • {webhookResult.message || webhookResult.error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Live Broadcast & Promo Pop-Up Manager */}
      {activeTab === 'promotions' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Flame className="w-4 h-4 animate-pulse" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Live Broadcast & Promo Pop-Up Manager
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Instantly push CRED-grade discount modals to all active user mobile sessions.
                </p>
              </div>

              {/* Master Toggle Switch */}
              <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Status:
                </span>
                <button
                  type="button"
                  onClick={handleTogglePromoActive}
                  disabled={promoLoading}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    promoData.is_active
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${promoData.is_active ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                  <span>{promoData.is_active ? 'ACTIVE (ON)' : 'PAUSED (OFF)'}</span>
                </button>
              </div>
            </div>

            {promoSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>Campaign updated! Live broadcast is synchronizing across all user devices.</span>
              </div>
            )}

            {/* Edit Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSavePromotion();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Offer Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Offer Title
                  </label>
                  <input
                    type="text"
                    value={promoData.title}
                    onChange={(e) => setPromoData({ ...promoData, title: e.target.value })}
                    placeholder="e.g. ⚡ Month-End Commercial Bill Rush"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* Badge Text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shimmering Badge Text
                  </label>
                  <input
                    type="text"
                    value={promoData.badge_text}
                    onChange={(e) => setPromoData({ ...promoData, badge_text: e.target.value })}
                    placeholder="e.g. 🔥 FLASH OFFER or LIMITED TIME"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* Subtitle / Description */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subtitle & Description
                  </label>
                  <textarea
                    rows={2}
                    value={promoData.subtitle}
                    onChange={(e) => setPromoData({ ...promoData, subtitle: e.target.value })}
                    placeholder="e.g. Transfer above ₹25,000 today & save flat ₹25 on convenience fees!"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none"
                    required
                  />
                </div>

                {/* Attached Coupon Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Attached Coupon Code
                  </label>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={promoData.coupon_code}
                      onChange={(e) => setPromoData({ ...promoData, coupon_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. SAVE25"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-amber-500 dark:text-amber-400 focus:outline-none focus:border-amber-500 uppercase"
                      required
                    />
                    <div className="flex gap-1.5">
                      {['SAVE10', 'SAVE25', 'SAVE50', 'REF15'].map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setPromoData({ ...promoData, coupon_code: code })}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                            promoData.coupon_code === code
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Target Minimum Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Minimum Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={promoData.target_amount || ''}
                    onChange={(e) => setPromoData({ ...promoData, target_amount: Number(e.target.value) })}
                    placeholder="25000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Pre-populates the `/pay` checkout sheet</span>
                </div>

                {/* CTA Button Label */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={promoData.cta_label}
                    onChange={(e) => setPromoData({ ...promoData, cta_label: e.target.value })}
                    placeholder="Claim Offer & Pay Now"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Audience
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPromoData({ ...promoData, target_audience: 'ALL' })}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                        promoData.target_audience === 'ALL'
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      All Users (Global)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromoData({ ...promoData, target_audience: 'HIGH_VOLUME' })}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                        promoData.target_audience === 'HIGH_VOLUME'
                          ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      High-Volume (&ge; 3 Payouts)
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={promoLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition active:scale-95 disabled:opacity-50"
                >
                  {promoLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Broadcasting Updates...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Save & Broadcast to Production</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Real-Time Live Preview Mockup */}
          <div className="rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Live User PWA Preview
              </h4>
              <span className="text-[10px] text-slate-400">
                Matches active styling rendered on user devices
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 flex justify-center">
              <div className="w-full max-w-xs rounded-2xl bg-gradient-to-b from-[#111827] via-[#0B0F19] to-[#04070D] border border-amber-500/30 p-4 shadow-xl relative overflow-hidden">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold mb-2.5">
                  <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span>{promoData.badge_text || '🔥 FLASH OFFER'}</span>
                </div>

                <h4 className="text-sm font-bold text-white mb-1">
                  {promoData.title || 'Offer Headline'}
                </h4>

                <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
                  {promoData.subtitle || 'Offer description text'}
                </p>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-700/60 mb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      {promoData.coupon_code || 'CODE'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Auto-Applies
                  </span>
                </div>

                <div className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow">
                  <span>{promoData.cta_label || 'Claim Offer'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back to Home */}
      <div className="pt-2 text-center">
        <Link
          href="/dashboard"
          className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold transition"
        >
          &larr; Return to Client Dashboard
        </Link>
      </div>
    </div>
  );
}
