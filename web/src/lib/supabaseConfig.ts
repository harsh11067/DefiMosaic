'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

// Supabase client configuration
function getSupabaseConfig() {
  // Access env vars at runtime (not at module level)
  if (typeof window === 'undefined') {
    // Server-side: return null
    return null;
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Debug: log which vars are missing
  const missingVars: string[] = [];
  if (!url) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  if (missingVars.length > 0) {
    console.warn('Missing Supabase environment variables:', missingVars);
    console.warn('Please set these in web/.env.local and restart the dev server');
  }
  
  return { url, anonKey };
}

let supabaseClient: SupabaseClient | null = null;
let initialized = false;

// Initialize Supabase - call this function in client components
export function initializeSupabase() {
  if (initialized && supabaseClient) {
    return supabaseClient;
  }
  
  if (typeof window === 'undefined') {
    return null;
  }
  
  const config = getSupabaseConfig();
  
  if (!config || !config.url || !config.anonKey) {
    console.warn('Supabase client config not available - check NEXT_PUBLIC_SUPABASE_* environment variables');
    return null;
  }
  
  try {
    supabaseClient = createClient(config.url, config.anonKey);
    console.log('Supabase client initialized successfully');
    initialized = true;
    return supabaseClient;
  } catch (error) {
    console.error('Supabase client initialization error:', error);
    return null;
  }
}

// Hook for client components
export function useSupabase() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    try {
      const client = initializeSupabase();
      setSupabase(client);
      
      if (!client) {
        const config = getSupabaseConfig();
        if (!config || !config.url || !config.anonKey) {
          setError('Supabase environment variables not set. Please check NEXT_PUBLIC_SUPABASE_* variables in .env.local');
        } else {
          setError('Supabase initialization failed. Check console for details.');
        }
      }
    } catch (err: any) {
      console.error('Supabase hook error:', err);
      setError(err.message || 'Supabase initialization error');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return { supabase, isLoading, error };
}

// Export for direct use (will be null until initialized)
export { supabaseClient };

