"use client";

import { useEffect, useState } from "react";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import type { Profile, DoctorProfile, UserRole } from "@/lib/types";

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  profile: Profile;
  doctorProfile?: DoctorProfile;
}

/**
 * Demo accounts created by `npm run seed:demo`. They are real Supabase Auth users,
 * so they sign in through the same path as everyone else.
 */
export const DEMO_CREDENTIALS = {
  patient: {
    email: "patient@medicare.demo",
    password: "Password123!",
    role: "patient" as UserRole,
  },
  doctor: {
    email: "doctor@medicare.demo",
    password: "Password123!",
    role: "doctor" as UserRole,
  },
};

/** Returns the signed-in session from the server, or null. Uses the session cookie. */
export async function fetchSession(): Promise<AuthSession | null> {
  try {
    const res = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    const body = await res.json();
    return body.session ?? null;
  } catch {
    return null;
  }
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const supabase = createBrowserSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const supabase = createBrowserSupabase();
  await supabase.auth.signOut();
}

/**
 * React hook for pages. `session` is null while loading and when signed out.
 * `loading` is false once the server has answered.
 */
export function useSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSession().then((s) => {
      if (!active) return;
      setSession(s);
      setLoading(false);
    });
    const supabase = createBrowserSupabase();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
      } else if (event === "SIGNED_IN") {
        fetchSession().then((s) => active && setSession(s));
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
