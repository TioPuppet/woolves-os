import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client. Uses NEXT_PUBLIC_* env vars (placeholders in M0).
 * No secrets here (R4). Real credentials are wired before M1 (auth).
 *
 * The non-null assertions are intentional: the app is expected to run with
 * env configured. In M0 the client is instantiated lazily so a missing env
 * value doesn't crash the scaffold's first render.
 */
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars ausentes. Configure NEXT_PUBLIC_SUPABASE_URL e ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local (ver .env.local.example).',
    );
  }

  cached = createBrowserClient(url, anonKey);
  return cached;
}
