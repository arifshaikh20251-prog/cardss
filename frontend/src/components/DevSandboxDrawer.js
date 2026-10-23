'use client';

import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Wrench, 
  FastForward, 
  RotateCcw, 
  UserCheck, 
  Clock, 
  ChevronUp, 
  ChevronDown, 
  X,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function DevSandboxDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const { user, login } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      setIsUnlocked(true);
      return;
    }
    // In production, check for explicit admin key or dev unlock flag in localStorage
    if (typeof window !== 'undefined') {
      const adminKey = localStorage.getItem('adminKey') || localStorage.getItem('fintech_admin_key');
      const devMode = localStorage.getItem('fintech_dev_mode') || localStorage.getItem('dev_sandbox_unlocked');
      if (adminKey === 'fintech_admin_secret_key_2026' || devMode === 'true') {
        setIsUnlocked(true);
      }
    }
  }, []);

  // Fast-Forward Cooling Action
  const handleFastForward = async () => {
    setLoadingAction('cooling');
    setStatusMessage(null);
    try {
      const res = await api.fastForwardCooling(24);
      setStatusMessage({
        type: 'success',
        text: `Released ${res.released_count || 0} transaction(s) to PAYOUT_SUCCESS with IMPS UTRs!`,
      });
      // Notify components to update
      window.dispatchEvent(new Event('refreshTransactions'));
      setTimeout(() => {
        router.refresh();
      }, 600);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to fast-forward cooling.',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Reset Sandbox Data
  const handleResetSandbox = async () => {
    setLoadingAction('reset');
    setStatusMessage(null);
    try {
      const res = await api.resetSandbox();
      setStatusMessage({
        type: 'success',
        text: 'Sandbox reset to initial seed state successfully!',
      });
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to reset sandbox.',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Quick switch test accounts
  const handleSwitchAccount = async (targetMobile) => {
    setLoadingAction(`switch_${targetMobile}`);
    setStatusMessage(null);
    try {
      const res = await api.verifyOtp({
        mobile: targetMobile,
        otp: '123456',
        full_name: targetMobile === '9876543210' ? 'Apex Solutions Private Limited' : 'Rohan Verma Enterprise',
        pan_number: targetMobile === '9876543210' ? 'AAACA1234F' : 'BBBCB5678K',
      });
      login(res.token, res.user);
      setStatusMessage({
        type: 'success',
        text: `Switched active session to ${res.user.full_name}!`,
      });
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to switch account.',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 max-w-md mx-auto pointer-events-none px-3">
      <div className="pointer-events-auto">
        {!isOpen ? (
          // Collapsed Floating Pill
          <div className="flex justify-center pb-1">
            <button
              onClick={() => setIsOpen(true)}
              className="px-3 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-bold flex items-center space-x-1.5 shadow-xl backdrop-blur-md transition active:scale-95 group"
            >
              <Wrench className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:rotate-45 transition-transform" />
              <span>Fintech Sandbox Tools</span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        ) : (
          // Expanded Drawer Panel
          <div className="rounded-2xl bg-white/98 dark:bg-slate-900/98 border border-slate-200 dark:border-slate-700/80 p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Dev Sandbox Controls</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Fintech simulation & time-travel tools</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setStatusMessage(null);
                }}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`mt-3 p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                )}
                <span className="text-[11px] leading-snug">{statusMessage.text}</span>
              </div>
            )}

            {/* Simulation Actions */}
            <div className="mt-3 space-y-2">
              {/* Fast Forward 24h */}
              <button
                onClick={handleFastForward}
                disabled={loadingAction !== null}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-indigo-950/20 dark:shadow-indigo-950/50 transition disabled:opacity-50"
              >
                {loadingAction === 'cooling' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <FastForward className="w-4 h-4 text-indigo-200" />
                )}
                <span>⏩ Fast-Forward 24h (Release Cooling Now)</span>
              </button>

              {/* Reset Demo Data */}
              <button
                onClick={handleResetSandbox}
                disabled={loadingAction !== null}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {loadingAction === 'reset' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500 dark:text-slate-400" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                )}
                <span>🔄 Reset Demo Data</span>
              </button>

              {/* Master Admin Center Link */}
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>🛡️ Master Admin Center (/admin)</span>
              </Link>
            </div>

            {/* Quick Switch Account */}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Quick Switch Persona
              </span>
              <div className="grid grid-cols-2 gap-2">
                {/* Persona 1: Verified */}
                <button
                  onClick={() => handleSwitchAccount('9876543210')}
                  disabled={loadingAction !== null || user?.mobile === '9876543210'}
                  className={`p-2 rounded-xl text-left border text-xs transition ${
                    user?.mobile === '9876543210'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-bold">Apex Soln</span>
                  </div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-mono">9876543210</span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-semibold mt-0.5">✓ Cooling Cleared</span>
                </button>

                {/* Persona 2: In-Cooling */}
                <button
                  onClick={() => handleSwitchAccount('9123456780')}
                  disabled={loadingAction !== null || user?.mobile === '9123456780'}
                  className={`p-2 rounded-xl text-left border text-xs transition ${
                    user?.mobile === '9123456780'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-[11px] font-bold">Rohan Verma</span>
                  </div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-mono">9123456780</span>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 block font-semibold mt-0.5">⏳ In 24h Cooling</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
