'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Mail,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUser } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user && isOpen) {
      setBusinessName(user.business_name || user.full_name || '');
      setBillingAddress(user.billing_address || '');
      setEmail(user.email || '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!businessName.trim()) {
      setErrorMsg('Business entity name is required.');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.updateProfile({
        business_name: businessName.trim(),
        billing_address: billingAddress.trim(),
        email: email.trim(),
      });

      if (res && res.success) {
        updateUser({
          business_name: res.user.business_name,
          billing_address: res.user.billing_address,
          email: res.user.email,
        });
        setSuccessMsg('Business profile updated successfully!');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update business profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-10 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                Business Profile Settings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Details appear on GST Invoices, Commercial Vouchers & Bank Statements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* KYC Status Strip */}
          <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">KYC Verified Entity</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                  PAN: {user?.pan_number || 'ABCDE1234F'} • Mobile: +91 {user?.mobile || '9988776655'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              Active Tier
            </span>
          </div>

          {/* Success / Error Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Business Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Company / Entity Legal Name</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Apex Innovations Private Limited"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
            />
          </div>

          {/* Billing Address Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span>Registered Business Billing Address</span>
            </label>
            <textarea
              rows={3}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="e.g. Level 4, Tech Enclave, Outer Ring Road, Bangalore - 560103"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition resize-none"
            />
          </div>

          {/* Email Address Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              <span>Billing & Statement Notification Email</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. finance@apexenterprise.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
            />
          </div>

          {/* Invoicing Preview Note */}
          <div className="p-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 flex items-start space-x-2 text-[11px] text-slate-600 dark:text-slate-300">
            <FileText className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              All future Tax Invoices, Settlement Vouchers, and Monthly Account Statements will automatically be issued with these verified credentials.
            </span>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-extrabold shadow-md transition active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
