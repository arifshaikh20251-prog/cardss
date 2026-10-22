'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/authContext';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-3">
      <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
      <span className="text-xs text-slate-400 font-medium">Loading UtilityPay Engine...</span>
    </div>
  );
}
