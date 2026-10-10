import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logAccess } from "@/lib/access/log";
import { errorResponse, requireSignedInPatient } from "@/lib/access/patient-access";

export async function POST(req: Request) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const patient_id = auth.user.id;

    const body = await req.json().catch(() => ({}));
    const { share_id } = body;

    if (!share_id || typeof share_id !== "string") {
      return NextResponse.json(
        { error: "Share ID is required to revoke" },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // Only the owner's share can be revoked
    const { data: share, error } = await createAdminClient()
      .from("shares")
      .update({ revoked_at: nowIso })
      .eq("id", share_id)
      .eq("patient_id", patient_id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Revoking share failed: ${error.message}`);
    if (!share) {
      return NextResponse.json({ error: "Share code not found" }, { status: 404 });
    }

    await logAccess({
      patient_id,
      actor_type: "patient",
      actor_id: patient_id,
      action: "share_revoked",
      detail: { share_id },
    });

    return NextResponse.json({
      success: true,
      share_id,
      revoked_at: nowIso,
    });
  } catch (err) {
    return errorResponse(err, "Failed to revoke share code");
  }
}
