'use client';

import React from 'react';
import TopHeader from './TopHeader';
import BottomNav from './BottomNav';
import DevSandboxDrawer from './DevSandboxDrawer';
import NetworkStatusPill from './NetworkStatusPill';
import ErrorBoundary from './ErrorBoundary';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#04070D] text-slate-900 dark:text-slate-100 flex justify-center selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md min-h-screen bg-slate-50 dark:bg-fintech-dark border-x border-slate-200 dark:border-slate-800/50 flex flex-col relative pb-20 shadow-2xl transition-colors duration-200">
        <NetworkStatusPill />
        <TopHeader />
        <main className="flex-1 px-4 py-4">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <DevSandboxDrawer />
        <BottomNav />
      </div>
    </div>
  );
}
