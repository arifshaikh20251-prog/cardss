'use client';

import React from 'react';
import { ShieldCheck, ShieldAlert, Bell, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../lib/authContext';

import Link from 'next/link';

export default function TopHeader() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const isVerified = user?.kyc_status === 'VERIFIED';
  const isCoolingCleared = user?.is_cooling_cleared;

  return (
    <header className="sticky top-0 z-30 bg-fintech-dark/95 backdrop-blur-md border-b border-fintech-border/50 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Brand & Tier */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-glow">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm tracking-tight text-white">UtilityPay</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-semibold px-1.5 py-0.5 rounded border border-indigo-500/30">
                B2B
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5 truncate max-w-[140px]">
              {user?.full_name || 'Corporate Payer'}
            </p>
          </div>
        </div>

        {/* Status Pill & Actions */}
        <div className="flex items-center space-x-2">
          {/* KYC & Cooling Badge */}
          <Link
            href="/kyc"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition active:scale-95 ${
              isVerified
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            {isVerified ? (
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3 h-3 text-amber-400" />
            )}
            <span>{isVerified ? 'KYC Verified' : 'Complete KYC'}</span>
          </Link>

          {/* Logout Action */}
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
