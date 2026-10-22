'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { api } from '../../lib/api';
import { maskAccount } from '../../lib/utils';
import {
  Users,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building,
  ArrowRight,
  X,
  Loader2,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';

function getBankTileTheme(ifsc = '', bankName = '') {
  const code = (ifsc || '').toUpperCase();
  const name = (bankName || '').toUpperCase();

  if (code.startsWith('HDFC') || name.includes('HDFC')) {
    return {
      gradient: 'from-[#0A1A3B] via-[#0D1527] to-[#0B0F17]',
      border: 'border-blue-500/40 hover:border-blue-400',
      badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      logoBg: 'bg-blue-600 text-white',
      initials: 'HDFC',
      accentColor: 'text-blue-400',
    };
  }
  if (code.startsWith('ICIC') || name.includes('ICICI')) {
    return {
      gradient: 'from-[#2D1204] via-[#1B110D] to-[#0B0F17]',
      border: 'border-orange-500/40 hover:border-orange-400',
      badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
      logoBg: 'bg-orange-600 text-white',
      initials: 'ICICI',
      accentColor: 'text-orange-400',
    };
  }
  if (code.startsWith('SBIN') || name.includes('SBI') || name.includes('STATE BANK')) {
    return {
      gradient: 'from-[#04202C] via-[#0A1724] to-[#0B0F17]',
      border: 'border-sky-500/40 hover:border-sky-400',
      badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      logoBg: 'bg-sky-600 text-white',
      initials: 'SBI',
      accentColor: 'text-sky-400',
    };
  }
  if (code.startsWith('UTIB') || name.includes('AXIS')) {
    return {
      gradient: 'from-[#280918] via-[#1A0E1A] to-[#0B0F17]',
      border: 'border-pink-500/40 hover:border-pink-400',
      badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
      logoBg: 'bg-pink-600 text-white',
      initials: 'AXIS',
      accentColor: 'text-pink-400',
    };
  }
  if (code.startsWith('KKBK') || name.includes('KOTAK')) {
    return {
      gradient: 'from-[#2B0A0A] via-[#1C0E0E] to-[#0B0F17]',
      border: 'border-red-500/40 hover:border-red-400',
      badge: 'bg-red-500/15 text-red-300 border-red-500/30',
      logoBg: 'bg-red-600 text-white',
      initials: 'KOTAK',
      accentColor: 'text-red-400',
    };
  }

  return {
    gradient: 'from-slate-900 via-indigo-950/40 to-[#0B0F17]',
    border: 'border-indigo-500/30 hover:border-indigo-400',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    logoBg: 'bg-indigo-600 text-white',
    initials: code.slice(0, 4) || 'BANK',
    accentColor: 'text-indigo-400',
  };
}

export default function BeneficiariesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [pan, setPan] = useState('');
  const [type, setType] = useState('VENDOR');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (isAuthenticated) {
      loadBeneficiaries();
    }
  }, [isAuthenticated, authLoading, router]);

  const loadBeneficiaries = async () => {
    try {
      setLoading(true);
      const res = await api.getBeneficiaries();
      setBeneficiaries(res.beneficiaries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Mock bank name derivation from IFSC prefix
  const handleIfscChange = (val) => {
    const clean = val.toUpperCase().trim();
    setIfsc(clean);
    if (clean.startsWith('HDFC')) setBankName('HDFC Bank Ltd');
    else if (clean.startsWith('ICIC')) setBankName('ICICI Bank Ltd');
    else if (clean.startsWith('SBIN')) setBankName('State Bank of India');
    else if (clean.startsWith('UTIB')) setBankName('Axis Bank Ltd');
    else if (clean.startsWith('KKBK')) setBankName('Kotak Mahindra Bank');
    else if (clean.length >= 4) setBankName('Commercial Scheduled Bank');
  };

  const handleAddBeneficiary = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (accountNumber !== confirmAccount) {
      setError('Bank account numbers do not match. Please re-check.');
      return;
    }

    if (!ifsc || ifsc.length !== 11) {
      setError('Please provide a valid 11-character Indian IFSC code (e.g., HDFC0000128).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createBeneficiary({
        account_holder_name: name.trim(),
        account_number: accountNumber.trim(),
        ifsc_code: ifsc.trim(),
        bank_name: bankName || 'Standard Commercial Bank',
        pan_number: pan ? pan.trim().toUpperCase() : null,
        beneficiary_type: type,
      });

      setSuccessMsg('Beneficiary registered! ₹1 Penny-Drop validation verified.');
      setName('');
      setAccountNumber('');
      setConfirmAccount('');
      setIfsc('');
      setPan('');
      loadBeneficiaries();
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to register beneficiary.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Title & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Beneficiary Vault</h2>
          <p className="text-xs text-slate-400 mt-0.5">Verified Payee Accounts & AML Guardrails</p>
        </div>
        <button
          onClick={() => {
            setError('');
            setSuccessMsg('');
            setIsModalOpen(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 font-bold text-xs text-white shadow-glow flex items-center space-x-1.5 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Payee</span>
        </button>
      </div>

      {/* AML Regulatory Notice Pill */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-start space-x-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          <strong>AML Anti-Self-Transfer Rule:</strong> Under RBI guidelines, paying to your own bank account or matching PAN is strictly prohibited. All payees undergo ₹1 penny-drop name match.
        </span>
      </div>

      {/* Beneficiaries List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-2">
          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
          <span className="text-xs text-slate-400">Loading verified payees...</span>
        </div>
      ) : beneficiaries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-white">No Beneficiaries Added</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[260px] mx-auto">
              Add your commercial landlord or B2B vendor bank account to start settling invoices.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-semibold text-indigo-400 underline underline-offset-2"
          >
            Add first beneficiary now &rarr;
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {beneficiaries.map((ben) => {
            const theme = getBankTileTheme(ben.ifsc_code, ben.bank_name);
            return (
              <div
                key={ben.id}
                className={`rounded-3xl bg-gradient-to-br ${theme.gradient} border ${theme.border} p-4 sm:p-5 transition-all duration-200 shadow-xl relative overflow-hidden flex flex-col space-y-3.5 group`}
              >
                {/* Subtle sheen highlight */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full blur-xl pointer-events-none" />

                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-start space-x-3">
                    {/* Bank Monogram Badge */}
                    <div className={`w-10 h-10 rounded-2xl ${theme.logoBg} font-black text-xs flex items-center justify-center shrink-0 shadow-md tracking-tighter`}>
                      {theme.initials}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-extrabold text-sm text-white">{ben.account_holder_name}</h4>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${theme.badge}`}>
                          {ben.beneficiary_type || 'VENDOR'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 font-medium">
                        {ben.bank_name || 'Bank'} • <span className="font-mono text-white font-bold">{maskAccount(ben.account_number)}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        IFSC: {ben.ifsc_code}
                      </p>
                    </div>
                  </div>

                  {/* Animated Penny Drop Verified Badge */}
                  <div className="flex items-center space-x-1.5 text-[10px] text-emerald-300 font-extrabold bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40 shadow-sm shadow-emerald-900/50 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>₹1 Penny Drop OK</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/5 flex items-center justify-between relative z-10">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Registered {new Date(ben.created_at || Date.now()).toLocaleDateString('en-IN')}
                  </span>

                  <Link
                    href={`/pay?beneficiary_id=${ben.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-glow transition active:scale-95"
                  >
                    <span>Pay Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Beneficiary Modal Sheet */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-fintech-card border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Payout Beneficiary</h3>
                  <p className="text-[10px] text-slate-400">Auto-verified via mock Penny-Drop</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddBeneficiary} className="space-y-3.5">
              {/* Type Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Beneficiary Classification
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="VENDOR">B2B Vendor / IT Supplier</option>
                  <option value="RENTAL_LANDLORD">Commercial Office Landlord</option>
                  <option value="COMMERCIAL_LEASE">Equipment Lease Partner</option>
                  <option value="UTILITY">Utility / Maintenance Agency</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Beneficiary Account Holder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. CloudWorks Technologies LLP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-amber-400/80 mt-1 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Must not match cardholder name to comply with AML terms.</span>
                </p>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bank Account Number
                </label>
                <input
                  type="password"
                  placeholder="9-18 digits"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Confirm Account Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Bank Account Number
                </label>
                <input
                  type="text"
                  placeholder="Re-enter bank account number"
                  value={confirmAccount}
                  onChange={(e) => setConfirmAccount(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* IFSC Code */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Bank IFSC Code
                  </label>
                  {bankName && (
                    <span className="text-[10px] text-indigo-400 font-semibold">{bankName}</span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="e.g. HDFC0000128"
                  value={ifsc}
                  onChange={(e) => handleIfscChange(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase font-mono"
                />
              </div>

              {/* Optional PAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Beneficiary PAN (Optional for TDS / Invoicing)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. BBBCB4321G"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase font-mono"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-emerald-500 hover:opacity-95 shadow-glow flex items-center justify-center space-x-1.5 transition active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing ₹1 Penny Drop...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Save Beneficiary</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
