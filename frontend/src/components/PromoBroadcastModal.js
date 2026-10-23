'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import {
  Sparkles,
  X,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Zap,
  Flame,
  Tag,
} from 'lucide-react';

export default function PromoBroadcastModal() {
  const router = useRouter();
  const [promo, setPromo] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkActivePromotion = async () => {
      try {
        const res = await api.getActivePromotion();
        if (!isMounted || !res || !res.success || !res.promotion) return;

        const promotion = res.promotion;
        if (!promotion.is_active) return;

        // Check 24-hour frequency capping
        const storageKey = `dismissed_promo_${promotion.id}`;
        const dismissedTimestamp = localStorage.getItem(storageKey);
        if (dismissedTimestamp) {
          const elapsed = Date.now() - Number(dismissedTimestamp);
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          if (elapsed < TWENTY_FOUR_HOURS) {
            return; // Capped for 24h
          }
        }

        setPromo(promotion);
        // Delay slightly for smooth entrance after page mount
        setTimeout(() => {
          if (isMounted) setIsOpen(true);
        }, 600);
      } catch (err) {
        console.debug('No active promotional broadcast:', err.message);
      }
    };

    checkActivePromotion();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    if (promo) {
      localStorage.setItem(`dismissed_promo_${promo.id}`, Date.now().toString());
    }
    setIsOpen(false);
  };

  const handleCopyCode = (e) => {
    e.stopPropagation();
    if (!promo?.coupon_code) return;
    navigator.clipboard.writeText(promo.coupon_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClaim = () => {
    if (!promo) return;
    handleDismiss();
    const targetAmount = promo.target_amount || 25000;
    const targetCoupon = promo.coupon_code || 'SAVE25';
    router.push(`/pay?amount=${targetAmount}&coupon=${targetCoupon}`);
  };

  if (!isOpen || !promo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      {/* Click-away backdrop */}
      <div className="absolute inset-0" onClick={handleDismiss} />

      {/* CRED-grade Glassmorphic Card */}
      <div
        className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#111827] via-[#0B0F19] to-[#04070D] border border-amber-500/30 p-6 shadow-[0_0_50px_rgba(245,158,11,0.22)] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow Orbs */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close 'X' Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors z-10"
          aria-label="Dismiss Offer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Shimmering Badge Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold tracking-wide shadow-sm mb-4">
          <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{promo.badge_text || '🔥 FLASH OFFER'}</span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white tracking-tight leading-snug mb-2 pr-6">
          {promo.title || '⚡ Month-End Commercial Bill Rush'}
        </h3>

        {/* Subtitle */}
        <p className="text-sm text-slate-300 leading-relaxed mb-5 font-normal">
          {promo.subtitle || 'Transfer above ₹25,000 today & save flat ₹25 on convenience fees!'}
        </p>

        {/* Promo Code Pill & 1-Click Copy */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/60 mb-5 group hover:border-amber-500/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Attached Coupon
              </div>
              <div className="text-base font-extrabold text-amber-400 tracking-wider font-mono">
                {promo.coupon_code || 'SAVE25'}
              </div>
            </div>
          </div>

          <button
            onClick={handleCopyCode}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600/60 text-xs font-medium text-slate-200 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Big Primary CTA Button */}
        <button
          onClick={handleClaim}
          type="button"
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] group"
        >
          <span>{promo.cta_label || 'Claim Offer & Pay Now'}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Micro Statutory Disclaimer */}
        <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-slate-400">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>SAC 9971 GST applied on net fee • Instant IMPS Settlement</span>
        </div>
      </div>
    </div>
  );
}
