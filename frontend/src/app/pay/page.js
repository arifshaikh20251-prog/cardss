'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { formatINR, maskAccount, calculateTotalFromBase } from '../../lib/utils';
import FeeBreakdown from '../../components/FeeBreakdown';
import MockPaymentModal from '../../components/MockPaymentModal';
import VirtualCardPreview from '../../components/VirtualCardPreview';
import SwipeToPay from '../../components/SwipeToPay';
import {
  CreditCard,
  Zap,
  Clock,
  ShieldCheck,
  AlertCircle,
  Building,
  Receipt,
  Users,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

function PayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState(
    searchParams.get('beneficiary_id') || ''
  );
  const [amount, setAmount] = useState('20000');
  const [transferType, setTransferType] = useState('INSTANT');
  const [purpose, setPurpose] = useState(searchParams.get('purpose') || 'VENDOR_INVOICE');
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState('');

  // Payment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (isAuthenticated) {
      loadBeneficiaries();
    }
  }, [isAuthenticated, authLoading, router]);

  const loadBeneficiaries = async () => {
    try {
      setLoading(true);
      const res = await api.getBeneficiaries();
      const list = res.beneficiaries || [];
      setBeneficiaries(list);
      if (!selectedBeneficiaryId && list.length > 0) {
        setSelectedBeneficiaryId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedBeneficiary = beneficiaries.find((b) => b.id === selectedBeneficiaryId);
  const numericAmount = parseFloat(amount || 0);
  const isOverCap = numericAmount > 25000;

  const handleInitiate = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedBeneficiaryId) {
      setError('Please select or add a verified beneficiary.');
      return;
    }

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    if (isOverCap) {
      setError('Single transaction amount exceeds maximum regulatory cap of ₹25,000.00.');
      return;
    }

    setInitiating(true);
    try {
      const res = await api.initiateTransaction({
        beneficiary_id: selectedBeneficiaryId,
        amount: numericAmount,
        transfer_type: transferType,
        purpose,
      });

      setCheckoutData(res.checkout);
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to initiate transaction.');
    } finally {
      setInitiating(false);
    }
  };

  const handlePaymentSuccess = (webhookResult) => {
    setIsModalOpen(false);
    setSuccessResult(webhookResult);
  };

  if (authLoading || (loading && !beneficiaries.length)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-2">
        <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
        <span className="text-xs text-slate-400">Loading payment checkout...</span>
      </div>
    );
  }

  // If payment succeeded, show success confirmation screen
  if (successResult) {
    const tx = successResult.transaction;

    return (
      <div className="py-6 space-y-5 animate-fade-in text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-glow-emerald">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white">Payment Authorized</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">
            {successResult.message || 'Credit card debited successfully.'}
          </p>
        </div>

        <div className="rounded-2xl bg-fintech-surface border border-slate-800 p-4 text-left space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Amount Debited</span>
            <span className="font-extrabold text-white">{formatINR(tx?.total_debited)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Beneficiary Payout</span>
            <span className="font-bold text-emerald-400">{formatINR(tx?.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Settlement Status</span>
            <span className="font-semibold text-indigo-400">{tx?.status}</span>
          </div>
          {tx?.utr_number && (
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">Bank UTR</span>
              <span className="text-emerald-400 font-bold">{tx?.utr_number}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2">
          <Link
            href="/transactions"
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-glow flex items-center justify-center space-x-1 transition active:scale-[0.98]"
          >
            <span>View in Transaction History & Download Invoice</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => {
              setSuccessResult(null);
              setCheckoutData(null);
            }}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Make another payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">Checkout & Pay</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Dual Fee Rates (INSTANT 3.5%, STANDARD 2.5%) + 18% GST
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Mobbin / Revolut Glassmorphic Virtual Card Preview */}
      <VirtualCardPreview
        cardholderName={user?.full_name}
        amount={amount}
        transferType={transferType}
      />

      <form onSubmit={handleInitiate} className="space-y-4">
        {/* Beneficiary Selector */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Select Recipient Beneficiary
            </label>
            <Link
              href="/beneficiaries"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              + New Payee
            </Link>
          </div>

          {beneficiaries.length === 0 ? (
            <div className="p-3.5 rounded-xl border border-dashed border-slate-800 text-center">
              <p className="text-xs text-slate-400 mb-2">No payees available in vault</p>
              <Link
                href="/beneficiaries"
                className="text-xs font-bold text-indigo-400 underline"
              >
                Add verified payee first &rarr;
              </Link>
            </div>
          ) : (
            <select
              value={selectedBeneficiaryId}
              onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
              className="w-full bg-fintech-surface border border-slate-700 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.account_holder_name} ({maskAccount(b.account_number)} • {b.bank_name || 'Bank'})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Transfer Purpose Toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Transfer Purpose (Category)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPurpose('VENDOR_INVOICE')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                purpose === 'VENDOR_INVOICE'
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Vendor Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => setPurpose('OFFICE_RENT')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                purpose === 'OFFICE_RENT'
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Office Rent</span>
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Principal Amount
            </label>
            <span
              className={`text-[11px] font-mono ${
                isOverCap ? 'text-red-400 font-bold' : 'text-slate-400'
              }`}
            >
              Max Cap: ₹25,000
            </span>
          </div>
          <div className="relative rounded-2xl bg-slate-900 border border-slate-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
              ₹
            </span>
            <input
              type="number"
              min="100"
              max="25000"
              step="100"
              placeholder="20000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent pl-9 pr-4 py-3.5 text-lg font-bold text-white placeholder-slate-600 focus:outline-none font-mono"
            />
          </div>
          {isOverCap && (
            <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>Exceeds single ticket cap of ₹25,000. Please reduce amount.</span>
            </p>
          )}
        </div>

        {/* Transfer Speed Radio Toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Transfer Speed & Settlement Rail
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Instant Pay */}
            <div
              onClick={() => setTransferType('INSTANT')}
              className={`cursor-pointer rounded-2xl p-3.5 border transition ${
                transferType === 'INSTANT'
                  ? 'bg-gradient-to-tr from-indigo-950/60 to-slate-900 border-indigo-500 shadow-glow'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Instant Pay</span>
                </span>
                <span className="text-[10px] font-extrabold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                  3.5%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                Real-time IMPS payout rail. Immediate settlement for cleared cards.
              </p>
            </div>

            {/* Standard Pay */}
            <div
              onClick={() => setTransferType('STANDARD')}
              className={`cursor-pointer rounded-2xl p-3.5 border transition ${
                transferType === 'STANDARD'
                  ? 'bg-gradient-to-tr from-indigo-950/60 to-slate-900 border-indigo-500 shadow-glow'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Standard Pay</span>
                </span>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  2.5%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                Lowest processing fee. Next business day batch settlement (T+1).
              </p>
            </div>
          </div>
        </div>

        {/* Live Dynamic Breakdown Box */}
        <FeeBreakdown amount={amount} transferType={transferType} />

        {/* CRED / Apple Pay Interactive Slider */}
        <div className="pt-2">
          <SwipeToPay
            amount={calculateTotalFromBase(numericAmount, transferType).totalPayable}
            transferType={transferType}
            onComplete={() => handleInitiate({ preventDefault: () => {} })}
            disabled={initiating || isOverCap || !numericAmount || !selectedBeneficiaryId}
            loading={initiating}
          />
        </div>
      </form>

      {/* Mock Payment Gateway Modal */}
      <MockPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        checkoutData={checkoutData}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-2">
          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
          <span className="text-xs text-slate-400">Loading checkout session...</span>
        </div>
      }
    >
      <PayContent />
    </Suspense>
  );
}
