// Public-by-design Supabase configuration.
//
// The project URL and the ANON key are meant to be exposed to browsers — they
// ship in the client bundle and access is enforced by Row-Level Security. They
// are pinned here as the source of truth so that a *stale hosting-provider
// environment variable* (e.g. a leftover value in a Vercel/Render dashboard
// pointing at a decommissioned project) cannot silently send the app to the
// wrong Supabase instance. A correct env var still wins; only known-stale
// project refs are ignored.
//
// SECRETS (service-role key) are NEVER hardcoded here — they stay env-only.

const PINNED_URL = "https://ghpgpvfkjjhcpotcvhli.supabase.co";
const PINNED_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdocGdwdmZrampoY3BvdGN2aGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NzI1ODIsImV4cCI6MjA5OTQ0ODU4Mn0.PC2dZRhUCoHWVbUK7b5mi0s0uvp3_ADhNiHEhxnjYTM";

// Project refs that must never be used again (decommissioned instances).
const STALE_REFS = ["aiobsubqjhrotfgqhmru"];

export const SUPABASE_URL = PINNED_URL;

/** Resolve the public {url, anonKey}, ignoring known-stale env values. */
export function resolveSupabasePublic(): { url: string; anonKey: string } {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const envIsCurrent = !!envUrl && !STALE_REFS.some((r) => envUrl.includes(r));
  return {
    url: envIsCurrent ? envUrl : PINNED_URL,
    anonKey: envIsCurrent && envAnon ? envAnon : PINNED_ANON,
  };
}

/** True when the current env points at a live (non-stale) project. */
export function envSupabaseIsCurrent(): boolean {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !!envUrl && !STALE_REFS.some((r) => envUrl.includes(r));
}
