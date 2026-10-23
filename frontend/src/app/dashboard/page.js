'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import CoolingBanner from '../../components/CoolingBanner';
import TransactionCard from '../../components/TransactionCard';
import ProfileModal from '../../components/ProfileModal';
import MonthlyStatementModal from '../../components/MonthlyStatementModal';
import Link from 'next/link';
import {
  Building2,
  Receipt,
  Users,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Plus,
  Loader2,
  RefreshCw,
  TrendingUp,
  Sparkles,
  Clock,
  CheckCircle2,
  Gift,
  Copy,
  Check,
  MessageSquare,
  FileText,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [referralStats, setReferralStats] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, authLoading, router]);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const [txRes, benRes, analyticsRes, refRes] = await Promise.all([
        api.getTransactions().catch(() => ({ transactions: [] })),
        api.getBeneficiaries().catch(() => ({ beneficiaries: [] })),
        api.getTransactionAnalytics().catch(() => null),
        api.getReferralStats().catch(() => null),
      ]);

      setTransactions(txRes.transactions || []);
      setBeneficiaries(benRes.beneficiaries || []);
      if (analyticsRes && analyticsRes.analytics) {
        setAnalytics(analyticsRes.analytics);
      }
      if (refRes && refRes.success) {
        setReferralStats(refRes);
      }
    } catch (e) {
      console.error('Failed to load dashboard', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (authLoading || (loading && !transactions.length)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs text-slate-500 dark:text-slate-400">Loading your fintech dashboard...</span>
      </div>
    );
  }

  // Calculate monthly stats
  const totalVolume = transactions.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
  const recentTransactions = transactions.slice(0, 3);

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
            Fintech Credit Engine
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Welcome, {user?.business_name || user?.full_name?.split(' ')[0] || 'Partner'}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setProfileModalOpen(true)}
            className="p-2 rounded-xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition active:scale-95"
            title="Edit Business Profile"
          >
            <Building2 className="w-4 h-4" />
          </button>
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pending KYC Action Banner */}
      {user?.kyc_status !== 'VERIFIED' && (
        <Link
          href="/kyc"
          className="block rounded-2xl bg-gradient-to-r from-amber-500/15 via-indigo-600/10 to-amber-500/15 border border-amber-500/40 p-3.5 transition hover:border-amber-400 active:scale-[0.99] group shadow-glow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center space-x-1.5">
                  <span>Complete KYC Verification</span>
                  <span className="text-[10px] bg-amber-500/25 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                    Action Required
                  </span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Verify PAN & Aadhaar to clear cooling-off windows and unlock instant bank settlements.
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0 ml-2" />
          </div>
        </Link>
      )}

      {/* Active Cooling Alert Banner */}
      <CoolingBanner transactions={transactions} />

      {/* Revolut-Style Monthly Financial Overview Card */}
      {(() => {
        const activeAnalytics = analytics || {
          current_month_total_amount: transactions.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0),
          current_month_swipe_count: transactions.length,
          active_cooling_count: transactions.filter((t) => t.status === 'IN_COOLING').length,
          settled_count: transactions.filter((t) => t.status === 'PAYOUT_SUCCESS' || t.status === 'SETTLED').length,
          total_fees_saved: 0,
          month_name: 'Current Month',
        };

        const totalSwipes = activeAnalytics.current_month_swipe_count || 0;
        const settledCount = activeAnalytics.settled_count || 0;
        const coolingCount = activeAnalytics.active_cooling_count || 0;
        const settledPct = totalSwipes > 0 ? Math.round((settledCount / Math.max(1, settledCount + coolingCount)) * 100) : 100;

        return (
          <div className="rounded-3xl bg-gradient-to-tr from-white via-indigo-50/40 to-white dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-slate-200/90 dark:border-indigo-500/30 p-5 shadow-sm dark:shadow-glow relative overflow-hidden transition-all space-y-4">
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header: Title + Month & Savings Badges */}
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center space-x-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Monthly Financial Overview</span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {activeAnalytics.month_name}
                </span>
              </div>

              {activeAnalytics.total_fees_saved > 0 ? (
                <div className="inline-flex items-center space-x-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Saved {formatINR(activeAnalytics.total_fees_saved)}</span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Cap: ₹25k/tx
                </span>
              )}
            </div>

            {/* Hero Spend Metric */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                Total Spent This Month
              </span>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-sans mt-0.5">
                {formatINR(activeAnalytics.current_month_total_amount)}
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 block uppercase">
                  Card Swipes
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                  {totalSwipes}
                </span>
              </div>

              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block uppercase">
                  Fees Saved
                </span>
                <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                  {formatINR(activeAnalytics.total_fees_saved)}
                </span>
              </div>

              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 block uppercase">
                  Active Payees
                </span>
                <span className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300 mt-0.5 block">
                  {beneficiaries.length}
                </span>
              </div>
            </div>

            {/* Visual Settlement vs Cooling Breakdown Pills */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Settled: {settledCount} Transfers</span>
                </span>
                <span className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>In-Cooling: {coolingCount} Holds</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                <div
                  style={{ width: `${settledPct}%` }}
                  className="h-full bg-emerald-500 transition-all duration-300"
                  title={`Settled ${settledPct}%`}
                />
                <div
                  style={{ width: `${100 - settledPct}%` }}
                  className="h-full bg-amber-500 transition-all duration-300"
                  title={`In Cooling ${100 - settledPct}%`}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Sleek Refer & Earn ₹25 Card with 1-Click WhatsApp Share */}
      {(() => {
        const userReferralCode = user?.referral_code || referralStats?.referral_code || 'PAY987';
        const shareMessage = `Pay vendor bills & commercial rent with credit card and get ₹15 off! Use my referral code: ${userReferralCode} at https://eshopcity.in`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

        const handleCopy = () => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(userReferralCode);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2500);
          }
        };

        return (
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-indigo-600/10 to-emerald-500/15 border border-emerald-500/30 p-4 sm:p-5 shadow-sm dark:shadow-glow relative overflow-hidden space-y-3.5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      Refer & Earn ₹25
                    </h3>
                    <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                      Zero-Loss
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Friends get <strong>₹15 OFF</strong> on their first transfer. You earn a <strong>₹25 discount coupon</strong> on their payout.
                  </p>
                </div>
              </div>

              {referralStats && referralStats.total_rewards_earned > 0 && (
                <div className="text-[10px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-1 rounded-full border border-emerald-500/30">
                  Earned: {formatINR(referralStats.total_rewards_earned)} ({referralStats.successful_payouts} friends)
                </div>
              )}
            </div>

            {/* Action Row: Code Box + Copy + WhatsApp Share Button */}
            <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
              {/* Code Box with Copy */}
              <div className="flex-1 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2 min-w-[160px] shadow-sm">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                    Your Referral Code
                  </span>
                  <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {userReferralCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition flex items-center space-x-1"
                  title="Copy Referral Code"
                >
                  {copiedCode ? (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center space-x-0.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </span>
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* 1-Click WhatsApp Share Button */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-md transition transform active:scale-95 shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </a>
            </div>
          </div>
        );
      })()}

      {/* Quick Action Cards */}
      <div>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Quick Bill & Utility Payments
          </h3>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Credit Card Payout</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Pay Office Rent */}
          <Link
            href="/pay?purpose=OFFICE_RENT"
            className="group rounded-2xl bg-white dark:bg-fintech-surface p-4 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition active:scale-[0.98] shadow-sm dark:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Commercial Rent</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">MCC 6513 • Landlords</p>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
              <span>Pay Rent</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Pay Vendor Invoice */}
          <Link
            href="/pay?purpose=VENDOR_INVOICE"
            className="group rounded-2xl bg-white dark:bg-fintech-surface p-4 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition active:scale-[0.98] shadow-sm dark:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Vendor Invoice</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">MCC 7399 • Suppliers</p>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Settle Invoice</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Beneficiaries Quick Strip */}
      <div className="rounded-2xl bg-white dark:bg-fintech-surface/60 border border-slate-200/90 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Beneficiary Vault</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{beneficiaries.length} verified payout accounts</p>
          </div>
        </div>
        <Link
          href="/beneficiaries"
          className="text-xs bg-slate-100 hover:bg-slate-200 text-indigo-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </Link>
      </div>

      {/* Recent Activity List */}
      <div>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Recent Settlements
          </h3>
          <Link href="/transactions" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold">
            View All ({transactions.length})
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center space-y-2 bg-white/50 dark:bg-transparent">
            <CreditCard className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400">No transactions recorded yet.</p>
            <Link
              href="/pay"
              className="inline-block text-xs text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-2"
            >
              Initiate your first vendor payment &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </div>

      {/* Profile Settings Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Monthly Statement Modal */}
      <MonthlyStatementModal
        isOpen={statementModalOpen}
        onClose={() => setStatementModalOpen(false)}
      />
    </div>
  );
}
