"use client";

import { useEffect, useState } from "react";
import { initializeSupabase } from "@/lib/supabaseConfig";
import { creditBankroll } from "@/lib/arena";

/**
 * Google sign-in via Supabase OAuth.
 * First sign-in grants a one-time +500 XP bankroll bonus on this device.
 * (Requires the Google provider to be enabled in the Supabase dashboard —
 * Auth → Providers → Google; the button explains this if it isn't yet.)
 */
export default function GoogleAuth() {
  const [email, setEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = initializeSupabase();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? null);
        setAvatar((data.user.user_metadata as any)?.avatar_url ?? null);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setEmail(session.user.email ?? null);
        setAvatar((session.user.user_metadata as any)?.avatar_url ?? null);
        // One-time welcome bonus per device
        const key = `googleBonus:${session.user.id}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          creditBankroll(500);
        }
      }
      if (event === "SIGNED_OUT") {
        setEmail(null);
        setAvatar(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    const supabase = initializeSupabase();
    if (!supabase) {
      alert("Supabase is not configured (NEXT_PUBLIC_SUPABASE_* env vars).");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) {
      alert(
        `Google sign-in isn't enabled yet.\n\nEnable it in Supabase → Authentication → Providers → Google, then try again.\n\n(${error.message})`
      );
    }
  };

  const signOut = async () => {
    const supabase = initializeSupabase();
    await supabase?.auth.signOut();
  };

  if (email) {
    return (
      <button
        onClick={signOut}
        title={`${email} — click to sign out`}
        className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-sm hover:border-red-400/50 transition-all"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="w-5 h-5 rounded-full" />
        ) : (
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
            {email[0].toUpperCase()}
          </span>
        )}
        <span className="text-gray-300 max-w-[90px] truncate">{email.split("@")[0]}</span>
      </button>
    );
  }

  return (
    <button
      onClick={signIn}
      disabled={busy}
      title="Sign in with Google — new accounts get +500 XP"
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.04] text-sm text-gray-300 hover:text-white hover:border-cyan-400/50 transition-all disabled:opacity-50"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
      Sign in
    </button>
  );
}
