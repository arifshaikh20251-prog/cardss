'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, LogOut, Zap, Sun, Moon } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { useTheme } from 'next-themes';
import Link from 'next/link';

export default function TopHeader() {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isAuthenticated) return null;

  const isVerified = user?.kyc_status === 'VERIFIED';
  const currentTheme = mounted ? resolvedTheme : 'dark';

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-fintech-dark/95 backdrop-blur-md border-b border-slate-200/80 dark:border-fintech-border/50 px-4 py-3 transition-colors duration-200">
      <div className="flex items-center justify-between">
        {/* Brand & Tier */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-glow">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">UtilityPay</span>
              <span className="text-[10px] bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded border border-indigo-500/20 dark:border-indigo-500/30">
                B2B
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5 truncate max-w-[130px]">
              {user?.full_name || 'Corporate Payer'}
            </p>
          </div>
        </div>

        {/* Status Pill, Theme Toggle, & Actions */}
        <div className="flex items-center space-x-2">
          {/* KYC Status Badge */}
          <Link
            href="/kyc"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition active:scale-95 ${
              isVerified
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            {isVerified ? (
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            )}
            <span>{isVerified ? 'KYC Verified' : 'Complete KYC'}</span>
          </Link>

          {/* Mobbin/Apple-Grade Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            title={currentTheme === 'dark' ? 'Switch to Crisp Light Mode' : 'Switch to Obsidian Dark Mode'}
            aria-label="Toggle visual theme"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-amber-400 shadow-sm"
          >
            {!mounted ? (
              <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 animate-pulse" />
            ) : currentTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 hover:-rotate-12" />
            )}
          </button>

          {/* Logout Action */}
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
