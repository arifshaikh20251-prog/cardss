'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import CoolingBanner from '../../components/CoolingBanner';
import TransactionCard from '../../components/TransactionCard';
import Link from 'next/link';
import {
  Building2,
  Receipt,
  Users,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  CreditCard,
  Plus,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      const [txRes, benRes] = await Promise.all([
        api.getTransactions().catch(() => ({ transactions: [] })),
        api.getBeneficiaries().catch(() => ({ beneficiaries: [] })),
      ]);

      setTransactions(txRes.transactions || []);
      setBeneficiaries(benRes.beneficiaries || []);
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
        <span className="text-xs text-slate-400">Loading your fintech dashboard...</span>
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
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
            Fintech Credit Engine
          </span>
          <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
            Welcome, {user?.full_name?.split(' ')[0] || 'Partner'}
          </h2>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={refreshing}
          className="p-2 rounded-xl bg-fintech-surface border border-slate-800 text-slate-400 hover:text-white transition active:scale-95"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Pending KYC Action Banner */}
      {user?.kyc_status !== 'VERIFIED' && (
        <Link
          href="/kyc"
          className="block rounded-2xl bg-gradient-to-r from-amber-500/15 via-indigo-600/10 to-amber-500/15 border border-amber-500/40 p-3.5 transition hover:border-amber-400 active:scale-[0.99] group shadow-glow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-xs flex items-center space-x-1.5">
                  <span>Complete KYC Verification</span>
                  <span className="text-[10px] bg-amber-500/25 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                    Action Required
                  </span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Verify PAN & Aadhaar to clear cooling-off windows and unlock instant bank settlements.
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0 ml-2" />
          </div>
        </Link>
      )}

      {/* Active Cooling Alert Banner */}
      <CoolingBanner transactions={transactions} />

      {/* Credit & Volume Summary Card */}
      <div className="rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-5 shadow-glow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Total Utility & Vendor Payouts</span>
          <span className="flex items-center space-x-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px]">
            <ShieldCheck className="w-3 h-3" />
            <span>Cap: ₹25k/tx</span>
          </span>
        </div>

        <div className="text-2xl font-black text-white tracking-tight font-sans">
          {formatINR(totalVolume)}
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Verified Vault</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{beneficiaries.length} Payees</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Settlement Rails</span>
            <span className="font-bold text-indigo-400 mt-0.5 block">IMPS Instant (3.5%)</span>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Quick Bill & Utility Payments
          </h3>
          <span className="text-[10px] text-indigo-400">Credit Card Payout</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Pay Office Rent */}
          <Link
            href="/pay?purpose=OFFICE_RENT"
            className="group rounded-2xl bg-fintech-surface p-4 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 transition active:scale-[0.98] shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Commercial Rent</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">MCC 6513 • Landlords</p>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-indigo-400 font-semibold">
              <span>Pay Rent</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Pay Vendor Invoice */}
          <Link
            href="/pay?purpose=VENDOR_INVOICE"
            className="group rounded-2xl bg-fintech-surface p-4 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/60 transition active:scale-[0.98] shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">Vendor Invoice</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">MCC 7399 • Suppliers</p>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
              <span>Settle Invoice</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Beneficiaries Quick Strip */}
      <div className="rounded-2xl bg-fintech-surface/60 border border-slate-800 p-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Beneficiary Vault</h4>
            <p className="text-[11px] text-slate-400">{beneficiaries.length} verified payout accounts</p>
          </div>
        </div>
        <Link
          href="/beneficiaries"
          className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold px-3 py-1.5 rounded-xl border border-slate-700 transition flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </Link>
      </div>

      {/* Recent Activity List */}
      <div>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Recent Settlements
          </h3>
          <Link href="/transactions" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
            View All ({transactions.length})
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center space-y-2">
            <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No transactions recorded yet.</p>
            <Link
              href="/pay"
              className="inline-block text-xs text-indigo-400 font-semibold underline underline-offset-2"
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
    </div>
  );
}
