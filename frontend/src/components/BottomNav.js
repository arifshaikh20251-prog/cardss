'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ArrowUpRight, History } from 'lucide-react';
import { useAuth } from '../lib/authContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated || pathname === '/login') return null;

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Beneficiaries', href: '/beneficiaries', icon: Users },
    { label: 'Pay Now', href: '/pay', icon: ArrowUpRight, highlight: true },
    { label: 'History', href: '/transactions', icon: History },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-fintech-dark/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-fintech-border/50 max-w-md mx-auto transition-colors duration-200">
      <div className="grid grid-cols-4 h-16 items-center px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.highlight) {
            return (
              <div key={item.href} className="flex justify-center items-center">
                <Link
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-5 group"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-glow border-2 border-white dark:border-fintech-dark transition-transform active:scale-95 group-hover:scale-105">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
