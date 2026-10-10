import { createClient } from "@/lib/supabase/server";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetSeconds: number;
}

// In-memory fallback map for development / unit test environments where Supabase DB is unavailable
const memoryRateLimits = new Map<string, { count: number; windowStart: number }>();

/**
 * Serverless & DB-backed rate limiter using the `rate_limits` table.
 * Fallback to memory map if DB connection fails.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const nowIso = new Date().toISOString();

  try {
    const supabase = await createClient();
    const { data: existing, error } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("key", key)
      .single();

    if (error && error.code !== "PGRST116") {
      // Record not found is PGRST116, other errors trigger fallback
      throw error;
    }

    if (!existing) {
      // Create new entry
      await supabase.from("rate_limits").insert({
        key,
        window_start: nowIso,
        count: 1,
      });
      return { success: true, remaining: limit - 1, resetSeconds: windowSeconds };
    }

    const windowStartSec = Math.floor(new Date(existing.window_start).getTime() / 1000);
    const elapsed = now - windowStartSec;

    if (elapsed > windowSeconds) {
      // Window expired, reset counter
      await supabase
        .from("rate_limits")
        .update({
          window_start: nowIso,
          count: 1,
        })
        .eq("key", key);
      return { success: true, remaining: limit - 1, resetSeconds: windowSeconds };
    }

    if (existing.count >= limit) {
      // Exceeded limit
      const resetSeconds = Math.max(1, windowSeconds - elapsed);
      return { success: false, remaining: 0, resetSeconds };
    }

    // Increment count
    const newCount = existing.count + 1;
    await supabase
      .from("rate_limits")
      .update({ count: newCount })
      .eq("key", key);

    return {
      success: true,
      remaining: limit - newCount,
      resetSeconds: Math.max(1, windowSeconds - elapsed),
    };
  } catch (_err) {
    // Memory fallback if DB is not reachable
    const entry = memoryRateLimits.get(key);
    if (!entry) {
      memoryRateLimits.set(key, { count: 1, windowStart: now });
      return { success: true, remaining: limit - 1, resetSeconds: windowSeconds };
    }

    const elapsed = now - entry.windowStart;
    if (elapsed > windowSeconds) {
      memoryRateLimits.set(key, { count: 1, windowStart: now });
      return { success: true, remaining: limit - 1, resetSeconds: windowSeconds };
    }

    if (entry.count >= limit) {
      return { success: false, remaining: 0, resetSeconds: Math.max(1, windowSeconds - elapsed) };
    }

    entry.count += 1;
    return {
      success: true,
      remaining: limit - entry.count,
      resetSeconds: Math.max(1, windowSeconds - elapsed),
    };
  }
}
