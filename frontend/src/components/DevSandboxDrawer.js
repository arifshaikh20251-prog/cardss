'use client';

import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useRouter } from 'next/navigation';
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
  const { user, login } = useAuth();
  const router = useRouter();

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
        text: 'Sandbox reset! Mock users and vault restored.',
      });
      window.dispatchEvent(new Event('refreshTransactions'));
      setTimeout(() => {
        router.refresh();
      }, 600);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to reset sandbox.',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Quick Switch Account
  const handleSwitchAccount = async (mobile) => {
    setLoadingAction(`switch-${mobile}`);
    setStatusMessage(null);
    try {
      await api.sendOtp(mobile);
      const authRes = await api.verifyOtp({ mobile, otp: '123456' });
      login(authRes.token, authRes.user);
      setStatusMessage({
        type: 'success',
        text: `Switched to ${authRes.user.full_name} (${authRes.user.mobile})`,
      });
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 500);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Account switch failed.',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed bottom-20 z-50 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pointer-events-none">
      <div className="pointer-events-auto">
        {!isOpen ? (
          // Collapsed Floating Badge
          <div className="flex justify-center">
            <button
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 text-xs font-semibold shadow-xl shadow-indigo-950/50 backdrop-blur-md transition hover:scale-105 active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <Wrench className="w-3.5 h-3.5" />
              <span>🛠️ Sandbox Tools</span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        ) : (
          // Expanded Drawer Panel
          <div className="rounded-2xl bg-slate-900/98 border border-slate-700/80 p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Dev Sandbox Controls</h4>
                  <p className="text-[10px] text-slate-400">Fintech simulation & time-travel tools</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setStatusMessage(null);
                }}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`mt-3 p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                    : 'bg-red-950/60 border border-red-500/30 text-red-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
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
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600/90 to-indigo-700/90 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-indigo-950/50 transition disabled:opacity-50"
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
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {loadingAction === 'reset' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>🔄 Reset Demo Data</span>
              </button>
            </div>

            {/* Quick Switch Account */}
            <div className="mt-3 pt-3 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Switch Persona
              </span>
              <div className="grid grid-cols-2 gap-2">
                {/* Persona 1: Verified */}
                <button
                  onClick={() => handleSwitchAccount('9876543210')}
                  disabled={loadingAction !== null || user?.mobile === '9876543210'}
                  className={`p-2 rounded-xl text-left border text-xs transition ${
                    user?.mobile === '9876543210'
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 font-bold'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-bold">Apex Soln</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block font-mono">9876543210</span>
                  <span className="text-[9px] text-emerald-400 block font-semibold mt-0.5">✓ Cooling Cleared</span>
                </button>

                {/* Persona 2: In-Cooling */}
                <button
                  onClick={() => handleSwitchAccount('9123456780')}
                  disabled={loadingAction !== null || user?.mobile === '9123456780'}
                  className={`p-2 rounded-xl text-left border text-xs transition ${
                    user?.mobile === '9123456780'
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-bold">Rohan Verma</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block font-mono">9123456780</span>
                  <span className="text-[9px] text-amber-400 block font-semibold mt-0.5">⏳ In 24h Cooling</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
