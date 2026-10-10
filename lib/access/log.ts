import { createAdminClient } from "@/lib/supabase/server";

export interface LogAccessParams {
  patient_id: string;
  actor_type: "patient" | "doctor" | "share_code" | "system";
  actor_id: string;
  action: string;
  detail?: Record<string, any>;
  ip?: string;
}

/**
 * Audit log helper: writes one row to `access_log`.
 * A failed audit write is reported to the server log but does not fail the user's request.
 */
export async function logAccess({
  patient_id,
  actor_type,
  actor_id,
  action,
  detail = {},
  ip = "127.0.0.1",
}: LogAccessParams): Promise<void> {
  const { error } = await createAdminClient().from("access_log").insert({
    patient_id,
    actor_type,
    actor_id,
    action,
    detail,
    ip,
  });
  if (error) {
    console.error("[access_log] write failed:", error.message);
  }
}

/** Returns the audit trail for one patient, newest first. */
export async function listAccessLogs(patientId: string) {
  const { data, error } = await createAdminClient()
    .from("access_log")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Loading access log failed: ${error.message}`);
  return data ?? [];
}
