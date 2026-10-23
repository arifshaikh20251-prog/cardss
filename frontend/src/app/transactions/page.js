'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import TransactionCard from '../../components/TransactionCard';
import CoolingBanner from '../../components/CoolingBanner';
import {
  History,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'IN_COOLING' | 'COMPLETED'

  // Dynamic Cashfree Gateway Settlement Status Polling
  const pollingOrderId = searchParams.get('order_id');
  const isPollingRequested = searchParams.get('status') === 'polling' || !!pollingOrderId;
  const [isPolling, setIsPolling] = useState(isPollingRequested);
  const [pollCount, setPollCount] = useState(0);
  const [pollSettledTx, setPollSettledTx] = useState(null);
  const pollIntervalRef = useRef(null);

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
      const list = res.transactions || [];
      setTransactions(list);

      // Check if target transaction has settled
      if (pollingOrderId) {
        const match = list.find(
          (t) => t.id === pollingOrderId || t.gateway_order_id === pollingOrderId
        );
        if (match && match.status !== 'INITIATED') {
          setPollSettledTx(match);
          setIsPolling(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Dynamic Polling Interval
  useEffect(() => {
    if (!isPolling) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      setPollCount((prev) => {
        if (prev >= 7) {
          // Stop polling after 8 attempts (16s)
          setIsPolling(false);
          clearInterval(pollIntervalRef.current);
          return prev;
        }
        fetchTransactions();
        return prev + 1;
      });
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isPolling, pollingOrderId]);

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

      {/* Dynamic Status Polling Banner (Cashfree Gateway Handshake) */}
      {isPolling && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-amber-500/10 to-indigo-500/10 border border-indigo-500/30 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-2.5">
            <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                <span>Cashfree Gateway Settlement Handshake</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-normal">
                  ({pollCount + 1}/8)
                </span>
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Polling live status for Order #{pollingOrderId ? pollingOrderId.slice(0, 12) : 'active'}...
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPolling(false)}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Settled Notification Banner */}
      {!isPolling && pollSettledTx && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                Gateway Settlement Verified!
              </span>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                Transaction status transitioned to <strong className="font-mono">{pollSettledTx.status}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPollSettledTx(null)}
            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

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

export default function TransactionsHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-2">
          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Loading ledger records...</span>
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}
