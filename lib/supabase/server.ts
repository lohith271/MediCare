import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Profile, UserRole } from "@/lib/types/database";

/** Public project URL (works on server and in the browser bundle). */
export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || undefined;
}

/** Publishable/anon key. Safe to expose to the browser. */
export function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    undefined
  );
}

/** Server-only secret key. Accepts both the legacy and the new Supabase naming. */
function getServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey() && getServiceRoleKey());
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)."
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

/** Cookie-bound client that acts as the signed-in user (respects RLS). */
export async function createClient() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) throw new SupabaseNotConfiguredError();

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Cookies cannot be set from a Server Component; the proxy/route refreshes them.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS, so only call it after the route has
 * checked who the caller is and which patient they may access.
 */
export function createAdminClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) throw new SupabaseNotConfiguredError();

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  profile: Profile;
}

/**
 * Returns the signed-in user and their profile, or null when nobody is logged in.
 * Routes must use `user.id` as the patient id instead of trusting request input.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    role: profile.role as UserRole,
    profile: profile as Profile,
  };
}
