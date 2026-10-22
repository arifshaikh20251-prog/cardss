'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { formatINR, maskAccount, calculateTotalFromBase } from '../../lib/utils';
import FeeBreakdown from '../../components/FeeBreakdown';
import MockPaymentModal from '../../components/MockPaymentModal';
import PaymentModeDrawer, { DEFAULT_SAVED_CARDS } from '../../components/PaymentModeDrawer';
import SwipeToPay from '../../components/SwipeToPay';
import {
  Zap,
  Clock,
  AlertCircle,
  Building,
  Receipt,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Paperclip,
  FileText,
  X,
  ChevronDown,
  ShieldCheck,
  CreditCard,
  UploadCloud,
  ChevronRight,
  User,
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
  const [amount, setAmount] = useState('15000');
  const [transferType, setTransferType] = useState('INSTANT');
  const [purpose, setPurpose] = useState(searchParams.get('purpose') || 'VENDOR_INVOICE');
  const [isPurposeOpen, setIsPurposeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState('');

  // Selected Credit Card State
  const [selectedCard, setSelectedCard] = useState(DEFAULT_SAVED_CARDS[0]);
  const [isCardDrawerOpen, setIsCardDrawerOpen] = useState(false);

  // Invoice Attachment State
  const [invoiceFile, setInvoiceFile] = useState(null);
  const fileInputRef = useRef(null);

  // Fee Breakdown Accordion
  const [showFeeDetails, setShowFeeDetails] = useState(false);

  // Payment Gateway Modal State
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

  const selectedBeneficiary = beneficiaries.find((b) => b.id === selectedBeneficiaryId) || beneficiaries[0];
  const numericAmount = parseFloat(amount || 0);
  const isOverCap = numericAmount > 25000;
  const breakdown = calculateTotalFromBase(numericAmount, transferType);

  const handleInitiate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    if (!selectedBeneficiary) {
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
        beneficiary_id: selectedBeneficiary.id,
        amount: numericAmount,
        transfer_type: transferType,
        purpose,
        card_id: selectedCard?.id,
        invoice_name: invoiceFile?.name || undefined,
      });

      setCheckoutData(res);
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || 'Payment initiation failed.');
    } finally {
      setInitiating(false);
    }
  };

  const handlePaymentSuccess = (result) => {
    setIsModalOpen(false);
    setSuccessResult(result);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5 MB limit.');
        return;
      }
      setInvoiceFile(file);
    }
  };

  if (authLoading || (loading && beneficiaries.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs text-slate-500 dark:text-slate-400">Loading checkout session...</span>
      </div>
    );
  }

  // Success Screen
  if (successResult) {
    const tx = successResult.transaction;

    return (
      <div className="py-6 space-y-5 animate-fade-in text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-glow-emerald">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Payment Authorized</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[280px] mx-auto">
            {successResult.message || 'Credit card debited successfully.'}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200/90 dark:border-slate-800 p-4 text-left space-y-2.5 text-xs shadow-sm">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Amount Debited</span>
            <span className="font-extrabold text-slate-900 dark:text-white">{formatINR(tx?.total_debited)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Beneficiary Payout</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatINR(tx?.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Card Debited</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {selectedCard.bankName} (•••• {selectedCard.last4})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Settlement Status</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{tx?.status}</span>
          </div>
          {tx?.utr_number && (
            <div className="flex justify-between font-mono">
              <span className="text-slate-500 dark:text-slate-400">Bank UTR</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">{tx?.utr_number}</span>
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
            className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
          >
            Make another payment
          </button>
        </div>
      </div>
    );
  }

  // Payee Initials helper
  const payeeInitials = (selectedBeneficiary?.account_holder_name || 'VP')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* A. Top Payee Monogram Header (Pice Style) */}
      <div className="rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Avatar Monogram */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md shrink-0 tracking-wider">
            {payeeInitials}
          </div>

          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
              {selectedBeneficiary?.account_holder_name || 'Select Beneficiary'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {selectedBeneficiary?.bank_name} • <span className="font-mono">{maskAccount(selectedBeneficiary?.account_number)}</span>
            </p>
          </div>
        </div>

        {/* Change Payee selector */}
        {beneficiaries.length > 1 ? (
          <select
            value={selectedBeneficiaryId}
            onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer shrink-0"
          >
            {beneficiaries.map((b) => (
              <option key={b.id} value={b.id}>
                {b.account_holder_name.split(' ')[0]} (•• {b.account_number.slice(-4)})
              </option>
            ))}
          </select>
        ) : (
          <Link
            href="/beneficiaries"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
          >
            + Add Payee
          </Link>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* B. Hero Transfer Amount & Purpose Pill */}
      <div className="rounded-3xl bg-white dark:bg-fintech-surface border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm text-center relative overflow-hidden space-y-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
          Transfer Amount
        </span>

        {/* Big Typography Amount Input */}
        <div className="flex items-center justify-center space-x-1">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 dark:text-slate-500">₹</span>
          <input
            type="number"
            min="100"
            max="25000"
            step="100"
            placeholder="15000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white bg-transparent text-center focus:outline-none w-48 font-sans tracking-tight"
          />
        </div>

        {/* Quick Amount Suggestion Chips */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {['5000', '10000', '15000', '25000'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition active:scale-95 ${
                amount === preset
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              +{formatINR(preset)}
            </button>
          ))}
        </div>

        {/* Purpose / Add Note Selector */}
        <div className="pt-2">
          {!isPurposeOpen ? (
            <button
              type="button"
              onClick={() => setIsPurposeOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition"
            >
              <Receipt className="w-3.5 h-3.5 text-indigo-500" />
              <span>Purpose: <strong className="text-slate-900 dark:text-white">{purpose.replace(/_/g, ' ')}</strong></span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 text-left animate-in fade-in-50">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Select Transaction Purpose (SAC 9971)</span>
                <button
                  type="button"
                  onClick={() => setIsPurposeOpen(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600"
                >
                  Done
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'VENDOR_INVOICE', label: 'Vendor Invoice', icon: Receipt },
                  { id: 'OFFICE_RENT', label: 'Office Rent', icon: Building },
                  { id: 'COMMERCIAL_LEASE', label: 'Commercial Lease', icon: Building },
                  { id: 'UTILITY_BILL', label: 'Utility Bill', icon: Zap },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPurpose(item.id);
                      setIsPurposeOpen(false);
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center space-x-1.5 transition ${
                      purpose === item.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isOverCap && (
          <p className="text-[11px] text-red-500 font-semibold pt-1">
            Exceeds maximum regulatory ticket cap of ₹25,000.
          </p>
        )}
      </div>

      {/* C. Compliance Invoice Attachment Tile (Pice Dotted Pattern) */}
      <div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
        />

        {!invoiceFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 p-3.5 transition-all bg-white/40 dark:bg-slate-900/40 flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                  Upload Invoice (Optional)
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Attach PDF, JPG, PNG up to 5 MB for GST audit
                </p>
              </div>
            </div>
            <Paperclip className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5 min-w-0">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-slate-900 dark:text-white truncate block">
                  {invoiceFile.name}
                </span>
                <span className="text-[10px] text-slate-500">
                  {(invoiceFile.size / 1024).toFixed(1)} KB • Attached for CA audit
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInvoiceFile(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* D. Speed Rail Selector Pill */}
      <div className="rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200/90 dark:border-slate-800 p-3.5 shadow-sm space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
          Settlement Rail Speed
        </span>

        <div className="grid grid-cols-2 gap-2">
          {/* Instant Pay */}
          <button
            type="button"
            onClick={() => setTransferType('INSTANT')}
            className={`p-3 rounded-xl border text-left transition ${
              transferType === 'INSTANT'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Instantly</span>
              </span>
              <span className="text-[10px] font-extrabold bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.2 rounded">
                3.5%
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              In few seconds • IMPS Rail
            </p>
          </button>

          {/* Standard Pay */}
          <button
            type="button"
            onClick={() => setTransferType('STANDARD')}
            className={`p-3 rounded-xl border text-left transition ${
              transferType === 'STANDARD'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Standard</span>
              </span>
              <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded">
                2.5%
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Next day batch (T+1)
            </p>
          </button>
        </div>
      </div>

      {/* E. Selected Card Selector Row (Triggers PaymentModeDrawer) */}
      <div
        onClick={() => setIsCardDrawerOpen(true)}
        className="cursor-pointer rounded-2xl bg-white dark:bg-fintech-surface border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 p-4 shadow-sm flex items-center justify-between transition group"
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl ${selectedCard.monogramBg} font-black text-xs flex items-center justify-center shrink-0 shadow-sm tracking-tighter`}
          >
            {selectedCard.monogram}
          </div>

          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Debit Card Source
            </span>
            <div className="flex items-center space-x-1.5 flex-wrap">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                {selectedCard.bankName}
              </h4>
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                •••• {selectedCard.last4}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedCard.network} • {selectedCard.cardName}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 flex items-center space-x-0.5 shrink-0"
        >
          <span>Change</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Fee Breakdown Accordion Toggle */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3">
        <button
          type="button"
          onClick={() => setShowFeeDetails(!showFeeDetails)}
          className="w-full flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-semibold"
        >
          <div className="flex items-center space-x-1.5">
            <span className="font-bold">Total Payable:</span>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
              {formatINR(breakdown.totalPayable)}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              (incl. ₹{breakdown.totalFee} fee & 18% GST)
            </span>
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center space-x-0.5">
            <span>{showFeeDetails ? 'Hide' : 'Details'}</span>
            {showFeeDetails ? <ChevronDown className="w-3.5 h-3.5 rotate-180" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {showFeeDetails && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 animate-in fade-in-50">
            <FeeBreakdown amount={amount} transferType={transferType} />
          </div>
        )}
      </div>

      {/* F. Bottom CTA & Trust Badge */}
      <div className="pt-2 space-y-2">
        <SwipeToPay
          amount={breakdown.totalPayable}
          transferType={transferType}
          onComplete={handleInitiate}
          disabled={initiating || isOverCap || !numericAmount || !selectedBeneficiary}
          loading={initiating}
        />

        {/* Footer Trust Badge (Pice Pattern) */}
        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-500 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>UtilityPay Protects • 100% RBI Escrow & Bank Grade Security</span>
        </div>
      </div>

      {/* Payment Mode Bottom Sheet Drawer */}
      <PaymentModeDrawer
        isOpen={isCardDrawerOpen}
        onClose={() => setIsCardDrawerOpen(false)}
        selectedCard={selectedCard}
        onSelectCard={(c) => {
          setSelectedCard(c);
          setIsCardDrawerOpen(false);
        }}
        amount={breakdown.totalPayable}
      />

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
          <span className="text-xs text-slate-500 dark:text-slate-400">Loading checkout session...</span>
        </div>
      }
    >
      <PayContent />
    </Suspense>
  );
}
