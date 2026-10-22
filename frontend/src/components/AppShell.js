'use client';

import React from 'react';
import TopHeader from './TopHeader';
import BottomNav from './BottomNav';
import DevSandboxDrawer from './DevSandboxDrawer';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-black text-slate-100 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-fintech-dark border-x border-slate-800/50 flex flex-col relative pb-20 shadow-2xl">
        <TopHeader />
        <main className="flex-1 px-4 py-4">{children}</main>
        <DevSandboxDrawer />
        <BottomNav />
      </div>
    </div>
  );
}
