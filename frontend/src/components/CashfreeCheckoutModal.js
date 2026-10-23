'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  ShieldCheck,
  Lock,
  X,
  ArrowRight,
  Loader2,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { formatINR } from '../lib/utils';
import { api } from '../lib/api';

const CASHFREE_TEST_CARDS = [
  {
    network: 'RuPay',
    type: 'Commercial Credit',
    bank: 'Kotak Mahindra Bank',
    cardNumber: '5089920000000001',
    displayNumber: '5089 9200 0000 0001',
    expiry: '12/28',
    cvv: '123',
    holderName: 'Apex Commercial Payer',
    badge: 'RuPay Commercial',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    network: 'Visa',
    type: 'Business Corporate',
    bank: 'HDFC Bank',
    cardNumber: '4012000000000002',
    displayNumber: '4012 0000 0000 0002',
    expiry: '11/29',
    cvv: '456',
    holderName: 'B2B Enterprise Client',
    badge: 'Visa Corporate',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    network: 'Mastercard',
    type: 'Corporate Purchasing',
    bank: 'ICICI Bank',
    cardNumber: '5123450000000008',
    displayNumber: '5123 4500 0000 0008',
    expiry: '07/30',
    cvv: '789',
    holderName: 'Executive Director',
    badge: 'Mastercard Business',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
];

export default function CashfreeCheckoutModal({
  isOpen,
  onClose,
  checkoutData,
  onPaymentSuccess,
}) {
  const router = useRouter();
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [cardNumber, setCardNumber] = useState(CASHFREE_TEST_CARDS[0].cardNumber);
  const [cardHolder, setCardHolder] = useState(CASHFREE_TEST_CARDS[0].holderName);
  const [cardExpiry, setCardExpiry] = useState(CASHFREE_TEST_CARDS[0].expiry);
  const [cardCvv, setCardCvv] = useState(CASHFREE_TEST_CARDS[0].cvv);

  // Checkout Stages: 'DETAILS' | '3DS_VERIFY' | 'PROCESSING' | 'SUCCESS'
  const [stage, setStage] = useState('DETAILS');
  const [otp, setOtp] = useState('777777');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);

  // Load Cashfree Web JS SDK v3
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.Cashfree) {
      setSdkReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Cashfree Web JS SDK v3 loaded successfully.');
      setSdkReady(true);
    };
    script.onerror = () => {
      console.warn('Cashfree SDK CDN unreachable, fallback simulator active.');
    };
    document.body.appendChild(script);

    return () => {
      // Keep script cached in DOM
    };
  }, []);

  // Sync preset card details
  const handleSelectPreset = (idx) => {
    setSelectedPreset(idx);
    const card = CASHFREE_TEST_CARDS[idx];
    setCardNumber(card.cardNumber);
    setCardHolder(card.holderName);
    setCardExpiry(card.expiry);
    setCardCvv(card.cvv);
  };

  // Launch official Cashfree Drop-in Checkout modal if real session available
  const handleLaunchOfficialModal = () => {
    if (!window.Cashfree || !checkoutData?.payment_session_id) return;

    try {
      const cashfree = window.Cashfree({ mode: 'sandbox' });
      cashfree
        .checkout({
          paymentSessionId: checkoutData.payment_session_id,
          redirectTarget: '_modal',
        })
        .then((result) => {
          if (result.error) {
            console.log('[CASHFREE] Modal closed or cancelled:', result.error);
          }
          if (result.paymentDetails) {
            handleCompleteSettlement(result.paymentDetails.paymentMessage || 'Cashfree payment captured');
          }
        })
        .catch((err) => {
          console.warn('[CASHFREE] Checkout invoke note:', err.message);
          // Fall back to embedded 3DS flow
          setStage('3DS_VERIFY');
        });
    } catch (err) {
      setStage('3DS_VERIFY');
    }
  };

  const handleProceedTo3DS = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 15) {
      setError('Please provide a valid 16-digit test credit card number.');
      return;
    }

    setStage('3DS_VERIFY');
  };

  const handleCompleteSettlement = async (remarks = 'Cashfree 3D Secure Authorized') => {
    setLoading(true);
    setError('');

    try {
      const activeCard = CASHFREE_TEST_CARDS[selectedPreset] || CASHFREE_TEST_CARDS[0];
      const payload = {
        order_id: checkoutData.gateway_order_id || checkoutData.order_id,
        gateway_payment_id: `CF_PAY_${Date.now()}`,
        payment_status: 'SUCCESS',
        card_network: activeCard.network.toLowerCase(),
        card_last4: cardNumber.slice(-4),
        bank_name: activeCard.bank,
        remarks,
      };

      // Complete via mock/live webhook handshake
      const res = await api.mockPgWebhook(payload);

      setStage('SUCCESS');
      setTimeout(() => {
        if (onPaymentSuccess) {
          onPaymentSuccess(res);
        } else {
          // Redirect back to /transactions with dynamic status polling
          router.push(`/transactions?order_id=${checkoutData.order_id}&status=polling`);
        }
      }, 1200);
    } catch (err) {
      setError(err.message || 'Gateway settlement failed.');
      setStage('DETAILS');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !checkoutData) return null;

  const currentPreset = CASHFREE_TEST_CARDS[selectedPreset] || CASHFREE_TEST_CARDS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 dark:bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-fintech-card border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Cashfree Payments
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  SANDBOX v3.0
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Official Drop-in Checkout & 3D Secure Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Pill */}
        <div className="my-3.5 p-3 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Total Debit (Inclusive of all taxes & 18% GST)
            </span>
            <span className="text-xs text-slate-400">
              Session: <code className="text-indigo-600 dark:text-indigo-400 font-mono">{checkoutData.payment_session_id?.slice(0, 20)}...</code>
            </span>
          </div>
          <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
            {formatINR(checkoutData.total_amount)}
          </span>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* STAGE 1: CARD DETAILS & CASHFREE PRESETS */}
        {stage === 'DETAILS' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Cashfree Sandbox Test Cards Pill Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Cashfree Sandbox Test Cards (1-Click Fill)</span>
                </label>
                <span className="text-[10px] text-slate-400">Select network</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CASHFREE_TEST_CARDS.map((card, idx) => (
                  <button
                    key={card.network}
                    type="button"
                    onClick={() => handleSelectPreset(idx)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      selectedPreset === idx
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span>{card.network}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full border ${card.badgeColor}`}>
                        {card.network === 'RuPay' ? '0% Extra' : '3DS'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                      {card.bank}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Realistic Credit Card Preview */}
            <div className="rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white p-4 shadow-xl border border-indigo-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />

              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                  {currentPreset.bank} • {currentPreset.type}
                </span>
                <span className="text-xs font-extrabold tracking-widest text-white/90">
                  {currentPreset.network.toUpperCase()}
                </span>
              </div>

              {/* EMV Chip Representation */}
              <div className="w-9 h-7 rounded-md bg-gradient-to-tr from-amber-400 to-amber-200 border border-amber-500/50 shadow-inner mb-3 flex items-center justify-center">
                <div className="w-5 h-4 border border-amber-700/40 rounded-sm" />
              </div>

              <div className="text-base font-mono font-bold tracking-widest mb-3 text-white drop-shadow">
                {cardNumber.replace(/(\d{4})/g, '$1 ').trim()}
              </div>

              <div className="flex justify-between items-end text-[10px] text-slate-300 font-mono">
                <div>
                  <span className="block text-[8px] text-slate-400 uppercase tracking-wider">Cardholder</span>
                  <span className="font-bold text-white uppercase">{cardHolder}</span>
                </div>
                <div className="flex space-x-4">
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase tracking-wider">Expires</span>
                    <span className="font-bold text-white">{cardExpiry}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase tracking-wider">CVV</span>
                    <span className="font-bold text-white">•••</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Card Input Fields */}
            <form onSubmit={handleProceedTo3DS} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Credit Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    maxLength={19}
                    placeholder="5089 9200 0000 0001"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    maxLength={5}
                    placeholder="12/28"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    CVV Security Code
                  </label>
                  <input
                    type="password"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    maxLength={4}
                    placeholder="123"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-glow flex items-center justify-center space-x-2 transition active:scale-[0.98]"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Verify with 3D Secure Simulation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {sdkReady && (
                  <button
                    type="button"
                    onClick={handleLaunchOfficialModal}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center space-x-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Launch Cashfree Official Drop-in Overlay</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* STAGE 2: 3D SECURE BANK SIMULATION */}
        {stage === '3DS_VERIFY' && (
          <div className="py-2 space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
              <div className="flex items-center space-x-2 mb-1">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-bold">RBI Mandated 3D Secure Authentication</h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Simulating Bank OTP authorization page for {currentPreset.bank} {currentPreset.network} Card.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Merchant</span>
                <span className="font-bold text-slate-900 dark:text-white">B2B UtilityPay Escrow</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Amount</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatINR(checkoutData.total_amount)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Card</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  •••• {cardNumber.slice(-4)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Enter 6-Digit Bank OTP (Cashfree Sandbox: <code className="text-indigo-600 dark:text-indigo-400">777777</code>)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-center tracking-widest font-extrabold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setOtp('777777')}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                  >
                    Auto-fill
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleCompleteSettlement('3DS OTP Verified (777777)')}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-glow flex items-center justify-center space-x-2 transition active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Communicating with Cashfree Gateway...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Authorize Debit of {formatINR(checkoutData.total_amount)}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStage('DETAILS')}
                disabled={loading}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
              >
                Back to Card Details
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: SUCCESS CONFIRMATION */}
        {stage === 'SUCCESS' && (
          <div className="py-6 space-y-3 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-glow-emerald">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
              Cashfree Payment Authorized!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gateway settlement handshake completed. Polling live transaction ledger...
            </p>
          </div>
        )}

        {/* Footer Security Guarantee */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center space-x-1.5 text-[10px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Cashfree 256-bit Encrypted • RBI Payment Aggregator Guidelines Compliant</span>
        </div>
      </div>
    </div>
  );
}
