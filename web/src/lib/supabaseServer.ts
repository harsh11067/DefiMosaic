import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client (for API routes)
let supabaseServer: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient | null {
  if (supabaseServer) {
    return supabaseServer;
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
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

