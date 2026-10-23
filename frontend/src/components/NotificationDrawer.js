'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
  AlertCircle,
  Loader2,
  Inbox,
} from 'lucide-react';
import { api } from '../lib/api';

/**
 * Format timestamp into relative readable string (e.g. "5 mins ago", "2 hours ago")
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSec = Math.floor((now - date) / 1000);

  if (diffInSec < 60) return 'Just now';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function NotificationDrawer({ isOpen, onClose, onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Initial fetch on mount for unread count badge
  useEffect(() => {
    loadNotifications(true);
    // Poll notifications every 30 seconds
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getNotifications();
      if (res && res.success) {
        setNotifications(res.notifications || []);
        const unread = res.unread_count ?? (res.notifications || []).filter((n) => !n.is_read).length;
        setUnreadCount(unread);
        if (onUnreadCountChange) onUnreadCountChange(unread);
      }
    } catch (err) {
      console.warn('Failed to load in-app notifications:', err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (onUnreadCountChange) onUnreadCountChange(Math.max(0, unreadCount - 1));

      await api.markNotificationAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
      loadNotifications(true);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      if (onUnreadCountChange) onUnreadCountChange(0);

      await api.markAllNotificationsAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      loadNotifications(true);
    } finally {
      setMarkingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer (CRED Style Dark / Clean Light) */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#0e1320] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full z-10">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                  Notification Center
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-sm animate-pulse">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Real-time IMPS, Cooling & Reward Alerts
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-indigo-500/10 transition disabled:opacity-50"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close notification center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2.5 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Fetching latest alerts...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
                <Inbox className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">All caught up!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[220px]">
                No pending notifications. We’ll notify you when transactions settle or cooling periods clear.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = !notif.is_read;
              const type = notif.type || 'INFO';

              // Visual styling configuration per CRED / High-contrast fintech design
              let badgeColor = 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
              let Icon = Bell;
              let iconColor = 'text-slate-500';

              if (type === 'SETTLED' || type === 'PAYOUT_SUCCESS') {
                badgeColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
                Icon = CheckCircle2;
                iconColor = 'text-emerald-500';
              } else if (type === 'COOLING' || type === 'IN_COOLING') {
                badgeColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
                Icon = Clock;
                iconColor = 'text-amber-500';
              } else if (type === 'REWARD' || type === 'REFERRAL') {
                badgeColor = 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30';
                Icon = Sparkles;
                iconColor = 'text-indigo-500';
              } else if (type === 'PAYMENT' || type === 'CAPTURE') {
                badgeColor = 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30';
                Icon = CreditCard;
                iconColor = 'text-sky-500';
              }

              return (
                <div
                  key={notif.id}
                  onClick={() => isUnread && handleMarkAsRead(notif.id)}
                  className={`group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isUnread
                      ? 'bg-gradient-to-br from-indigo-500/[0.06] to-transparent dark:from-indigo-950/30 dark:to-transparent border-indigo-500/30 dark:border-indigo-500/40 shadow-sm'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between space-x-2">
                    <div className="flex items-start space-x-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${badgeColor}`}>
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {notif.title}
                          </h5>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                            {type}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isUnread && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-1.5 py-0.5 rounded transition shrink-0"
                        title="Mark as read"
                      >
                        Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Certified RBI Fintech Ledger Notifications • 256-bit Encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
