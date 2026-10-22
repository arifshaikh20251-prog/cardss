'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import TransactionCard from '../../components/TransactionCard';
import CoolingBanner from '../../components/CoolingBanner';
import { History, RefreshCw, Loader2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function TransactionsHistoryPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'IN_COOLING' | 'COMPLETED'

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (isAuthenticated) {
      fetchTransactions();
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchTransactions = async () => {
    try {
      setRefreshing(true);
      const res = await api.getTransactions();
      setTransactions(res.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = transactions.filter((t) => {
    if (filterTab === 'IN_COOLING') return t.status === 'IN_COOLING';
    if (filterTab === 'COMPLETED') return t.status === 'PAYOUT_SUCCESS';
    return true;
  });

  const coolingCount = transactions.filter((t) => t.status === 'IN_COOLING').length;
  const completedCount = transactions.filter((t) => t.status === 'PAYOUT_SUCCESS').length;

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Transaction History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time IMPS settlements & GST Tax Invoices
          </p>
        </div>
        <button
          onClick={fetchTransactions}
          disabled={refreshing}
          className="p-2 rounded-xl bg-white dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition active:scale-95"
          title="Refresh history"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Active Cooling Alert Banner */}
      <CoolingBanner transactions={transactions} />

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-fintech-surface border border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setFilterTab('ALL')}
          className={`py-2 rounded-xl transition ${
            filterTab === 'ALL'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          All ({transactions.length})
        </button>

        <button
          onClick={() => setFilterTab('IN_COOLING')}
          className={`py-2 rounded-xl transition ${
            filterTab === 'IN_COOLING'
              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          In Cooling ({coolingCount})
        </button>

        <button
          onClick={() => setFilterTab('COMPLETED')}
          className={`py-2 rounded-xl transition ${
            filterTab === 'COMPLETED'
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Settled ({completedCount})
        </button>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-2">
          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Loading ledger records...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center space-y-3 bg-white/50 dark:bg-transparent">
          <History className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Transactions Found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] mx-auto">
              {filterTab === 'ALL'
                ? 'Your transfer activity will appear here once initiated.'
                : `No transactions matching status '${filterTab}'.`}
            </p>
          </div>
          <Link
            href="/pay"
            className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 underline underline-offset-2"
          >
            <span>Initiate payment</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tx) => (
            <TransactionCard key={tx.id} transaction={tx} />
          ))}
        </div>
      )}
    </div>
  );
}
