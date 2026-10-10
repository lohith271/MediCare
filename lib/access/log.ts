import { createClient } from "@/lib/supabase/server";

export interface LogAccessParams {
  patient_id: string;
  actor_type: "patient" | "doctor" | "share_code" | "system";
  actor_id: string;
  action: string;
  detail?: Record<string, any>;
  ip?: string;
}

// In-memory fallback for testing
export const memoryAccessLogs: Array<{
  id: string;
  patient_id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  detail: Record<string, any>;
  ip: string;
  created_at: string;
}> = [];

/**
 * Audit log helper: Writes entry to `access_log` table.
 */
export async function logAccess({
  patient_id,
  actor_type,
  actor_id,
  action,
  detail = {},
  ip = "127.0.0.1",
}: LogAccessParams): Promise<void> {
  const nowIso = new Date().toISOString();

  try {
    const supabase = await createClient();
    await supabase.from("access_log").insert({
      patient_id,
      actor_type,
      actor_id,
      action,
      detail,
      ip,
      created_at: nowIso,
    });
  } catch (_err) {
    // Fallback to memory array if DB is not reachable
    memoryAccessLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patient_id,
      actor_type,
      actor_id,
      action,
      detail,
      ip,
      created_at: nowIso,
    });
  }
}
