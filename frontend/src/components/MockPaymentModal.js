'use client';

import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Lock, X, ArrowRight, Loader2 } from 'lucide-react';
import { formatINR } from '../lib/utils';
import { api } from '../lib/api';

export default function MockPaymentModal({
  isOpen,
  onClose,
  checkoutData,
  onPaymentSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardNumber] = useState('4532 •••• •••• 8824');
  const [cardExpiry] = useState('08/28');
  const [cardCvv] = useState('821');

  if (!isOpen || !checkoutData) return null;

  const handleSimulateSwipe = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        order_id: checkoutData.order_id,
        gateway_payment_id: `PAY_MOCK_SWIPE_${Date.now()}`,
      };

      const result = await api.mockPgWebhook(payload);
      if (onPaymentSuccess) {
        onPaymentSuccess(result);
      }
    } catch (err) {
      setError(err.message || 'Payment simulation failed.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-fintech-card border-t sm:border border-slate-200 dark:border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment Gateway Simulation</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Mock Card Swipe & Settlement Sandbox</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Pill */}
        <div className="my-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total Debit Amount</span>
          <span className="text-base font-extrabold text-slate-900 dark:text-white">
            {formatINR(checkoutData.total_amount)}
          </span>
        </div>

        {/* Mock Card Preview */}
        <div className="rounded-xl bg-gradient-to-tr from-slate-100 via-indigo-50/70 to-slate-200 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 border border-slate-300 dark:border-indigo-500/30 p-4 mb-4 shadow-sm dark:shadow-glow relative overflow-hidden">
          <div className="flex justify-between items-center text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold tracking-wider uppercase mb-3">
            <span>Corporate Visa Infinite</span>
            <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div className="text-sm font-mono tracking-widest text-slate-900 dark:text-white font-bold mb-3">
            {cardNumber}
          </div>

          <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono">
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">Valid Thru</span>
              <span>{cardExpiry}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500 uppercase">CVV</span>
              <span>{cardCvv}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleSimulateSwipe}
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:opacity-95 transition shadow-glow flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Simulating Card Swipe & Cooling Check...</span>
            </>
          ) : (
            <>
              <span>Simulate Successful Card Swipe</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-slate-500 mt-3 flex items-center justify-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
          <span>256-Bit SSL Encrypted Sandbox Gateway</span>
        </p>
      </div>
    </div>
  );
}
