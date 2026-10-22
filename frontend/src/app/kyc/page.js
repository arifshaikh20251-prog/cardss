'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  KeyRound,
  Building,
  UserCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function KycVerificationPage() {
  const router = useRouter();
  const { user, updateUser, isAuthenticated, loading: authLoading } = useAuth();

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [kycStatus, setKycStatus] = useState(user?.kyc_status || 'PENDING');
  const [step, setStep] = useState(1); // 1 = PAN, 2 = Aadhaar, 3 = Complete

  // PAN form state
  const [panNumber, setPanNumber] = useState(user?.pan_number || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [panLoading, setPanLoading] = useState(false);
  const [panResult, setPanResult] = useState(null);
  const [panError, setPanError] = useState('');

  // Aadhaar form state
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [otpDispatched, setOtpDispatched] = useState(false);
  const [clientRefId, setClientRefId] = useState('');
  const [maskedAadhaar, setMaskedAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [verifyOtpLoading, setVerifyOtpLoading] = useState(false);
  const [aadhaarResult, setAadhaarResult] = useState(null);
  const [aadhaarError, setAadhaarError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated) {
      fetchCurrentKycStatus();
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchCurrentKycStatus = async () => {
    try {
      const res = await api.getKycStatus();
      setKycStatus(res.kyc_status || 'PENDING');
      if (res.pan_number) {
        setPanNumber(res.pan_number);
        setPanResult({ pan: res.pan_number, valid: true });
        if (res.kyc_status === 'VERIFIED') {
          setStep(3);
        } else {
          setStep(2);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch KYC status', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleVerifyPan = async (e) => {
    e.preventDefault();
    setPanError('');
    setPanLoading(true);

    try {
      const cleanPan = panNumber.trim().toUpperCase();
      const res = await api.verifyPan({
        panNumber: cleanPan,
        fullName: fullName.trim(),
      });

      setPanResult(res.data);
      updateUser({ pan_number: cleanPan, kyc_step: 'AADHAAR_PENDING' });
      setStep(2);
    } catch (err) {
      setPanError(err.message || 'PAN verification failed. Check the format.');
    } finally {
      setPanLoading(false);
    }
  };

  const handleInitiateAadhaar = async (e) => {
    e.preventDefault();
    setAadhaarError('');
    setAadhaarLoading(true);

    try {
      const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
      const res = await api.initiateAadhaar({ aadhaarNumber: cleanAadhaar });
      setClientRefId(res.clientRefId);
      setMaskedAadhaar(res.maskedAadhaar);
      setOtpDispatched(true);
    } catch (err) {
      setAadhaarError(err.message || 'Failed to dispatch Aadhaar OTP.');
    } finally {
      setAadhaarLoading(false);
    }
  };

  const handleVerifyAadhaarOtp = async (e) => {
    e.preventDefault();
    setAadhaarError('');
    setVerifyOtpLoading(true);

    try {
      const res = await api.verifyAadhaar({
        clientRefId,
        otp: otp.trim(),
      });

      setAadhaarResult(res.data);
      setKycStatus('VERIFIED');
      updateUser({
        kyc_status: 'VERIFIED',
        is_cooling_cleared: true,
        pan_number: panNumber.toUpperCase(),
      });
      setStep(3);
    } catch (err) {
      setAadhaarError(err.message || 'Invalid Aadhaar OTP. Try mock code 123456.');
    } finally {
      setVerifyOtpLoading(false);
    }
  };

  if (authLoading || loadingStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs text-slate-400">Verifying KYC credentials...</span>
      </div>
    );
  }

  const isVerified = kycStatus === 'VERIFIED';

  return (
    <div className="space-y-5 animate-fade-in pb-10 max-w-md mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div
          className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
            isVerified
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          {isVerified ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          <span>{isVerified ? 'KYC Verified' : 'Standard Tier'}</span>
        </div>
      </div>

      {/* Hero Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
          <span>KYC Verification Engine</span>
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Verify corporate PAN & Aadhaar via RBI-approved e-KYC to clear cooling-off windows and unlock instant bank settlements.
        </p>
      </div>

      {/* Multi-Step Stepper */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div
          className={`p-3 rounded-2xl border transition-all ${
            step >= 2 || panResult
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : step === 1
              ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200 shadow-glow'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-[10px] uppercase tracking-wider">Step 1</span>
            {step >= 2 || panResult ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <FileText className="w-4 h-4 text-indigo-400" />
            )}
          </div>
          <p className="font-bold text-xs text-white">PAN Card Check</p>
          <p className="text-[10px] text-slate-400 mt-0.5">ITD Syntax & Match</p>
        </div>

        <div
          className={`p-3 rounded-2xl border transition-all ${
            step === 3 || isVerified
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : step === 2
              ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200 shadow-glow'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-[10px] uppercase tracking-wider">Step 2</span>
            {step === 3 || isVerified ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <KeyRound className="w-4 h-4 text-indigo-400" />
            )}
          </div>
          <p className="font-bold text-xs text-white">Aadhaar OTP</p>
          <p className="text-[10px] text-slate-400 mt-0.5">UIDAI e-KYC Verification</p>
        </div>
      </div>

      {/* Success Badge Banner (if already verified or completed) */}
      {(step === 3 || isVerified) && (
        <div className="rounded-3xl bg-gradient-to-tr from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 p-5 space-y-4 shadow-glow">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Account KYC Verified</h3>
              <p className="text-xs text-emerald-400/90 font-medium mt-0.5">
                Statutory limits cleared • Instant IMPS active
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Verified PAN:</span>
              <span className="font-mono text-white font-bold">{panNumber || 'ABCDE1234F'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Aadhaar Holder:</span>
              <span className="text-white font-semibold">{aadhaarResult?.name || user?.full_name || 'Verified Partner'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Masked UIDAI:</span>
              <span className="font-mono text-slate-300">{aadhaarResult?.maskedAadhaar || 'XXXXXXXX5544'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Cooling Window:</span>
              <span className="text-emerald-400 font-bold">BYPASSED (Instant Releases)</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Link
              href="/pay"
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-500 font-bold text-xs text-white text-center shadow-glow active:scale-95 transition"
            >
              Make Payment Now
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 py-3 rounded-2xl bg-slate-800 border border-slate-700 font-bold text-xs text-slate-200 text-center active:scale-95 transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* STEP 1: PAN Verification Card */}
      {step === 1 && (
        <div className="rounded-3xl bg-fintech-surface/90 border border-slate-800 p-5 space-y-4 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-indigo-400 text-xs font-semibold">
                <Building className="w-3.5 h-3.5" />
                <span>Entity Verification</span>
              </div>
              <h3 className="font-extrabold text-white text-base">Verify PAN Card</h3>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
              NSDL / ITD
            </span>
          </div>

          <form onSubmit={handleVerifyPan} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Full Registered Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Apex Solutions Private Limited"
                required
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Permanent Account Number (PAN)
              </label>
              <input
                type="text"
                maxLength={10}
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                required
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white font-mono uppercase tracking-widest focus:outline-none focus:border-indigo-500 transition"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Must match standard format: 5 letters, 4 digits, 1 letter.
              </p>
            </div>

            {panError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{panError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={panLoading || panNumber.trim().length !== 10}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold text-xs shadow-glow flex items-center justify-center space-x-2 active:scale-95 transition disabled:opacity-50"
            >
              {panLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating with ITD...</span>
                </>
              ) : (
                <>
                  <span>Verify PAN Card</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sandbox tip */}
          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 text-[11px] text-slate-400">
            <span className="font-bold text-indigo-400">Sandbox Test PAN:</span> Any valid format like{' '}
            <code className="text-slate-200">ABCDE1234F</code> passes instant verification.
          </div>
        </div>
      )}

      {/* STEP 2: Aadhaar OTP Card */}
      {step === 2 && !isVerified && (
        <div className="rounded-3xl bg-fintech-surface/90 border border-slate-800 p-5 space-y-4 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-semibold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>UIDAI e-KYC</span>
              </div>
              <h3 className="font-extrabold text-white text-base">Aadhaar OTP Verification</h3>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
              6-Digit OTP
            </span>
          </div>

          {/* PAN Verified confirmation tag */}
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PAN Verified: {panNumber}</span>
            </div>
            <span className="text-[10px] text-slate-400">Active</span>
          </div>

          {!otpDispatched ? (
            <form onSubmit={handleInitiateAadhaar} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Aadhaar Number (12 Digits)
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={aadhaarNumber}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 12);
                    // Add space formatting 4-4-4
                    const parts = cleaned.match(/.{1,4}/g) || [];
                    setAadhaarNumber(parts.join(' '));
                  }}
                  placeholder="XXXX XXXX 9012"
                  required
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white font-mono tracking-widest focus:outline-none focus:border-indigo-500 transition"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  OTP will be sent to the mobile linked with your Aadhaar.
                </p>
              </div>

              {aadhaarError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-rose-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aadhaarError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={aadhaarLoading || aadhaarNumber.replace(/\D/g, '').length !== 12}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-500 text-white font-bold text-xs shadow-glow flex items-center justify-center space-x-2 active:scale-95 transition disabled:opacity-50"
              >
                {aadhaarLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Requesting UIDAI OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAadhaarOtp} className="space-y-3.5">
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-xs space-y-1">
                <span className="text-slate-400 block">OTP sent to Aadhaar linked mobile:</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">{maskedAadhaar}</span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Enter 6-Digit OTP
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">Sandbox: 123456</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-center text-lg font-mono text-white tracking-[0.5em] focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {aadhaarError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-rose-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aadhaarError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={verifyOtpLoading || otp.trim().length !== 6}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs shadow-glow flex items-center justify-center space-x-2 active:scale-95 transition disabled:opacity-50"
              >
                {verifyOtpLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying e-KYC...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Complete KYC</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOtpDispatched(false)}
                className="w-full text-center text-[11px] text-slate-400 hover:text-white pt-1"
              >
                Change Aadhaar Number
              </button>
            </form>
          )}

          {/* Sandbox tip */}
          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 text-[11px] text-slate-400">
            <span className="font-bold text-emerald-400">Mock Mode Hint:</span> Enter any 12-digit number (e.g.{' '}
            <code className="text-slate-200">987654321012</code>) and OTP <code className="text-emerald-300 font-bold">123456</code>.
          </div>
        </div>
      )}
    </div>
  );
}
