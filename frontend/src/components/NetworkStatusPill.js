'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export default function NetworkStatusPill() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualCheck = () => {
    setIsChecking(true);
    setTimeout(() => {
      if (typeof navigator !== 'undefined') {
        const online = navigator.onLine;
        setIsOnline(online);
        if (online) {
          setShowReconnected(true);
          setTimeout(() => setShowReconnected(false), 3000);
        }
      }
      setIsChecking(false);
    }, 600);
  };

  // Only render if offline OR briefly showing reconnected message
  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-300 transform animate-fade-in"
    >
      {!isOnline ? (
        // Offline Warning Pill
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-medium shadow-xl backdrop-blur-md border border-rose-500/40 bg-rose-950/90 text-rose-200 dark:bg-[#160B11]/95 dark:text-rose-300 dark:border-rose-500/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>Offline: Check your internet connection</span>
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            title="Check connection"
            className="ml-1 p-0.5 rounded-full hover:bg-rose-800/40 text-rose-300 transition-colors focus:outline-none"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
        </div>
      ) : (
        // Back Online Success Pill (temporary 3.5s)
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium shadow-xl backdrop-blur-md border border-emerald-500/40 bg-emerald-950/90 text-emerald-200 dark:bg-[#061B12]/95 dark:text-emerald-300 dark:border-emerald-500/50">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Back online &bull; Connected</span>
        </div>
      )}
    </div>
  );
}
