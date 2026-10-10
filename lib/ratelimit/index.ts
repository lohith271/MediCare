import { createAdminClient } from "@/lib/supabase/server";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * DB-backed rate limiter using the `rate_limits` table.
 * The table has RLS enabled with no policies, so it is accessed with the
 * service-role client. Database errors are thrown; there is no in-memory fallback,
 * because a per-process counter is not a real limit on serverless hosts.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const nowIso = new Date().toISOString();
  const supabase = createAdminClient();

  const { data: existing, error } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`Rate limit check failed: ${error.message}`);

  if (!existing) {
    const { error: insertError } = await supabase
      .from("rate_limits")
      .insert({ key, window_start: nowIso, count: 1 });
    if (insertError) throw new Error(`Rate limit write failed: ${insertError.message}`);
    return { success: true, remaining: limit - 1, resetSeconds: windowSeconds };
  }

  const windowStartSec = Math.floor(new Date(existing.window_start).getTime() / 1000);
  const elapsed = now - windowStartSec;

  if (elapsed > windowSeconds) {
    const { error: resetError } = await supabase
      .from("rate_limits")
      .update({ window_start: nowIso, count: 1 })
      .eq("key", key);
    if (resetError) throw new Error(`Rate limit reset failed: ${resetError.message}`);
    return { success: true, remaining: limit - 1, resetSeconds: windowSeconds };
  }

  if (existing.count >= limit) {
    const resetSeconds = Math.max(1, windowSeconds - elapsed);
    return { success: false, remaining: 0, resetSeconds };
  }

  const newCount = existing.count + 1;
  const { error: incError } = await supabase
    .from("rate_limits")
    .update({ count: newCount })
    .eq("key", key);
  if (incError) throw new Error(`Rate limit update failed: ${incError.message}`);

  return {
    success: true,
    remaining: limit - newCount,
    resetSeconds: Math.max(1, windowSeconds - elapsed),
  };
}
