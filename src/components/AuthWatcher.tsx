'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Self-heals a broken session: if the refresh token becomes invalid (Supabase
 * returns 400 on /auth/v1/token) supabase-js emits SIGNED_OUT and clears the
 * session. Instead of leaving the user stuck with stale cached reads and every
 * write failing, we send them to a clean login.
 */
export function AuthWatcher() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        const p = window.location.pathname;
        if (!p.startsWith('/login') && !p.startsWith('/signup')) {
          window.location.href = '/login';
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}
