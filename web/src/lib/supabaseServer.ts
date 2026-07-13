import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resolveSupabasePublic, envSupabaseIsCurrent } from '@/config/supabasePublic';

// Server-side Supabase client (for API routes)
let supabaseServer: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient | null {
  if (supabaseServer) {
    return supabaseServer;
  }

  // Pin the URL to the current project (ignores stale hosting env vars).
  const { url, anonKey } = resolveSupabasePublic();
  // Only trust the service-role key when the env actually points at the current
  // project; otherwise fall back to the (public, RLS-limited) anon key so we
  // never send a mismatched key to a different instance.
  const serviceRoleKey = envSupabaseIsCurrent()
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey)
    : anonKey;

  if (!url || !serviceRoleKey) {
    console.warn('Supabase server config not available - check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }
  
  try {
    // Use service role key for server-side operations (bypasses RLS)
    // If service role key not available, fall back to anon key
    supabaseServer = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('Supabase server client initialized successfully');
    return supabaseServer;
  } catch (error) {
    console.error('Supabase server initialization error:', error);
    return null;
  }
}

