'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronsRight, Check, Loader2, Sparkles } from 'lucide-react';
import { formatINR } from '../lib/utils';

export default function SwipeToPay({
  amount = 0,
  transferType = 'INSTANT',
  onComplete,
  disabled = false,
  loading = false,
}) {
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const trackRef = useRef(null);
  const startXRef = useRef(0);

  // Reset slider if amount or disabled status changes
  useEffect(() => {
    if (!loading && isCompleted) {
      const timer = setTimeout(() => {
        setIsCompleted(false);
        setDragProgress(0);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, isCompleted]);

  const handlePointerDown = (e) => {
    if (disabled || loading || isCompleted) return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !trackRef.current || disabled || loading || isCompleted) return;

    const trackWidth = trackRef.current.clientWidth - 56; // 56px handle size
    const currentX = e.clientX;
    const deltaX = currentX - startXRef.current;
    const progress = Math.min(1, Math.max(0, deltaX / trackWidth));

    setDragProgress(progress);

    // If dragged over 88% threshold, trigger completion
    if (progress >= 0.88) {
      setIsDragging(false);
      setDragProgress(1);
      setIsCompleted(true);
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Snap back if threshold wasn't reached
    if (dragProgress < 0.88) {
      setDragProgress(0);
    }
  };

  const numericAmount = parseFloat(amount || 0);

  return (
    <div className="w-full select-none">
      <div
        ref={trackRef}
        className={`relative h-14 rounded-2xl overflow-hidden flex items-center transition-all ${
          disabled
            ? 'bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 opacity-50 cursor-not-allowed'
            : isCompleted
            ? 'bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 dark:border-emerald-500/50 shadow-glow-emerald'
            : 'bg-slate-200/90 dark:bg-slate-900/90 border border-slate-300/80 dark:border-slate-700/80 shadow-inner dark:shadow-lg dark:shadow-black/40'
        }`}
      >
        {/* Dynamic Gradient Fill Track */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 transition-all duration-75 ease-out"
          style={{ width: `${Math.max(dragProgress * 100, 0)}%` }}
        />

        {/* Shimmer Track Glow */}
        {!disabled && !isCompleted && !loading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent animate-pulse pointer-events-none" />
        )}

        {/* Center Label (Fades out during drag) */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-150"
          style={{ opacity: Math.max(0, 1 - dragProgress * 2) }}
        >
          {loading ? (
            <div className="flex items-center space-x-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authorizing Transfer...</span>
            </div>
          ) : isCompleted ? (
            <div className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Payment Initiated!</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-800 dark:text-white tracking-wide">
              <span>Slide to Transfer</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black">{formatINR(numericAmount)}</span>
              <ChevronsRight className="w-4 h-4 text-slate-500 dark:text-slate-400 animate-pulse ml-0.5" />
            </div>
          )}
        </div>

        {/* Draggable Thumb / Handle */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute left-1.5 top-1.5 bottom-1.5 w-11 h-11 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none z-10 transition-transform ${
            isDragging ? 'scale-105' : 'transition-all duration-200'
          } ${
            isCompleted
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/50'
              : 'bg-white text-slate-900 shadow-md border border-slate-200 dark:border-transparent dark:shadow-xl dark:shadow-black/50 hover:bg-slate-50 dark:hover:bg-slate-100'
          }`}
          style={{
            transform: trackRef.current
              ? `translateX(${dragProgress * (trackRef.current.clientWidth - 56)}px)`
              : 'translateX(0px)',
          }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          ) : isCompleted ? (
            <Check className="w-5 h-5 stroke-[3] text-white" />
          ) : (
            <ChevronsRight className="w-5 h-5 text-indigo-600" />
          )}
        </div>
      </div>

      {/* Micro-helper text */}
      <div className="mt-1.5 flex justify-between items-center px-1 text-[10px] text-slate-500">
        <span>CRED-style single-swipe checkout</span>
        <span>SAC 9971 Certified</span>
      </div>
    </div>
  );
}
