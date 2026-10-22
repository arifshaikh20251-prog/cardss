'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { Smartphone, Lock, ShieldCheck, ArrowRight, Zap, Loader2, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Enter mobile, 2: Enter OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError('');

    const clean = mobile.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp(clean);
      setDevOtpHint(res.otp || '123456');
      setOtp(res.otp || '123456'); // Dev convenience: autofill mock code
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Ensure backend is running on :5000.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setError('');

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const clean = mobile.replace(/\D/g, '').slice(-10);
      const res = await api.verifyOtp({
        mobile: clean,
        otp: otp.trim(),
        full_name: clean === '9876543210' ? 'Apex Solutions Private Limited' : 'Business Partner Corp',
        pan_number: clean === '9876543210' ? 'AAACA1234F' : 'BBBCB5678K',
      });

      login(res.token, res.user);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid OTP code. Please use 123456.');
    } finally {
      setLoading(false);
    }
  };

  const autofillDemoAccount = (demoMobile) => {
    setMobile(demoMobile);
    setError('');
  };

  return (
    <div className="flex flex-col justify-center min-h-[85vh] py-6 animate-fade-in">
      {/* Brand Hero */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-glow">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">UtilityPay</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">
          B2B Vendor Invoicing & Commercial Rental Payment Network
        </p>
      </div>

      {/* Login Card */}
      <div className="rounded-3xl bg-fintech-surface/90 border border-slate-800 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5">
          <h2 className="text-base font-bold text-white">
            {step === 1 ? 'Enter your mobile number' : 'Verify One-Time Password'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {step === 1
              ? 'An authentication code will be sent via SMS.'
              : `Code sent to +91 ${mobile.slice(-10)}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mobile Number
              </label>
              <div className="flex rounded-xl bg-slate-900 border border-slate-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition overflow-hidden">
                <span className="px-3.5 py-3 text-xs font-semibold text-slate-400 bg-slate-800/60 border-r border-slate-700 flex items-center">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent px-3.5 py-3 text-sm text-white placeholder-slate-600 focus:outline-none font-mono"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || mobile.length < 10}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 transition shadow-glow flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Enter 6-Digit OTP
                </label>
                {devOtpHint && (
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Mock: {devOtpHint}
                  </span>
                )}
              </div>
              <div className="rounded-xl bg-slate-900 border border-slate-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent px-4 py-3 text-center text-lg tracking-[0.5em] font-mono text-white placeholder-slate-600 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:opacity-95 transition shadow-glow flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Verify & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-xs text-slate-400 hover:text-white transition pt-1"
            >
              Change mobile number
            </button>
          </form>
        )}

        {/* Quick Demo Pre-seed Autofill pills */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <span className="block text-[11px] text-slate-400 font-semibold mb-2 text-center uppercase tracking-wider">
            Quick Sandbox Accounts:
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => autofillDemoAccount('9876543210')}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition"
            >
              <span className="font-semibold text-white block">Apex Solutions</span>
              <span className="text-[10px] text-emerald-400">KYC Verified</span>
            </button>
            <button
              type="button"
              onClick={() => autofillDemoAccount('9123456780')}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left transition"
            >
              <span className="font-semibold text-white block">Rohan Verma</span>
              <span className="text-[10px] text-amber-400">In 24h Cooling</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Footer */}
      <div className="mt-8 text-center text-slate-500 text-[11px] flex items-center justify-center space-x-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>RBI Compliant B2B Utility & Vendor Payment Intermediary</span>
      </div>
    </div>
  );
}
