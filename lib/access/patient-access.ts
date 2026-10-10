import { NextResponse } from "next/server";
import {
  createAdminClient,
  getSessionUser,
  isSupabaseConfigured,
  SupabaseNotConfiguredError,
  type SessionUser,
} from "@/lib/supabase/server";
import { SHARE_COOKIE, verifyEmergencySessionToken, verifyShareSessionToken } from "@/lib/access/session";

/*
 * Who may read or change a patient's data.
 *
 * - The signed-in patient always acts on their own record (user.id).
 * - A doctor has no account-level access. They may use a share code (scope-checked)
 *   or an approved emergency request, passed as `Authorization: Bearer <token>`.
 *   The patient id comes only from the verified token and the database row it points to.
 * - Request bodies and query strings never supply a patient id for an authenticated caller.
 */

export type PatientAccess =
  | {
      ok: true;
      patientId: string;
      actorType: "patient" | "doctor" | "share_code";
      actorId: string;
      user: SessionUser | null;
    }
  | { ok: false; status: 401 | 403 | 503; error: string };

/**
 * Share token from `Authorization: Bearer`, or from the share cookie set when a doctor
 * enters a code. The cookie lets the doctor's pages read data without handling tokens.
 */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (match) return match[1];

  const cookies = req.headers.get("cookie") || "";
  const cookie = cookies
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SHARE_COOKIE}=`));
  return cookie ? decodeURIComponent(cookie.slice(SHARE_COOKIE.length + 1)) : null;
}

/**
 * Resolves the patient whose data a request may read.
 * `scope` is the share category the route needs ("all", "allergies", "medications",
 * "conditions", "lab_results"). A share with "all" passes every check.
 */
export async function resolvePatientAccess(req: Request, scope?: string): Promise<PatientAccess> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, error: new SupabaseNotConfiguredError().message };
  }

  const user = await getSessionUser();
  if (user?.role === "patient") {
    return { ok: true, patientId: user.id, actorType: "patient", actorId: user.id, user };
  }

  const token = bearerToken(req);
  if (!token) {
    return user
      ? { ok: false, status: 403, error: "Doctor access requires a share code or emergency approval" }
      : { ok: false, status: 401, error: "Please sign in" };
  }

  const share = await verifyShareSessionToken(token);
  if (share) {
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from("shares")
      .select("id, patient_id, scope, expires_at, revoked_at")
      .eq("id", share.share_id)
      .maybeSingle();
    if (error) throw new Error(`Loading share failed: ${error.message}`);
    // The database row is authoritative: revocation and expiry apply immediately.
    if (
      !row ||
      row.patient_id !== share.patient_id ||
      row.revoked_at ||
      new Date(row.expires_at) <= new Date()
    ) {
      return { ok: false, status: 401, error: "This share code is no longer valid" };
    }
    const scopes: string[] = Array.isArray(row.scope) ? row.scope : [];
    if (scope && !scopes.includes("all") && !scopes.includes(scope)) {
      return { ok: false, status: 403, error: "This share code does not include this information" };
    }
    return { ok: true, patientId: row.patient_id, actorType: "share_code", actorId: row.id, user: null };
  }

  const emergency = await verifyEmergencySessionToken(token);
  if (emergency) {
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from("emergency_requests")
      .select("id, patient_id, doctor_id, status, access_expires_at")
      .eq("id", emergency.request_id)
      .maybeSingle();
    if (error) throw new Error(`Loading emergency request failed: ${error.message}`);
    if (
      !row ||
      row.patient_id !== emergency.patient_id ||
      row.doctor_id !== emergency.doctor_id ||
      row.status !== "approved" ||
      !row.access_expires_at ||
      new Date(row.access_expires_at) <= new Date()
    ) {
      return { ok: false, status: 401, error: "This emergency access is no longer valid" };
    }
    return { ok: true, patientId: row.patient_id, actorType: "doctor", actorId: row.doctor_id, user: null };
  }

  return { ok: false, status: 401, error: "Invalid or expired access token" };
}

/** Owner-only routes: the caller must be a signed-in patient. */
export async function requireSignedInPatient(): Promise<
  { ok: true; user: SessionUser } | { ok: false; status: 401 | 403 | 503; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, error: new SupabaseNotConfiguredError().message };
  }
  const user = await getSessionUser();
  if (!user) return { ok: false, status: 401, error: "Please sign in" };
  if (user.role !== "patient") return { ok: false, status: 403, error: "Only patients can do this" };
  return { ok: true, user };
}

/** Signed-in doctor, for routes where a doctor starts an emergency action. */
export async function requireSignedInDoctor(): Promise<
  { ok: true; user: SessionUser } | { ok: false; status: 401 | 403 | 503; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, error: new SupabaseNotConfiguredError().message };
  }
  const user = await getSessionUser();
  if (!user) return { ok: false, status: 401, error: "Please sign in" };
  if (user.role !== "doctor") return { ok: false, status: 403, error: "Only doctors can do this" };
  return { ok: true, user };
}

/** Maps thrown errors to JSON: unconfigured Supabase becomes 503, everything else 500. */
export function errorResponse(err: unknown, fallbackMessage: string): NextResponse {
  if (err instanceof SupabaseNotConfiguredError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  const message = err instanceof Error && err.message ? err.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status: 500 });
}
