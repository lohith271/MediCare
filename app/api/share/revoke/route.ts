import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAccess } from "@/lib/access/log";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { share_id, patient_id: reqPatientId } = body;

    if (!share_id) {
      return NextResponse.json(
        { error: "Share ID is required to revoke" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const nowIso = new Date().toISOString();

    const { data: share, error } = await supabase
      .from("shares")
      .update({ revoked_at: nowIso })
      .eq("id", share_id)
      .select("patient_id")
      .single();

    const patient_id = share?.patient_id || user?.id || reqPatientId || "unknown";

    await logAccess({
      patient_id,
      actor_type: "patient",
      actor_id: user?.id || patient_id,
      action: "share_revoked",
      detail: { share_id },
    });

    return NextResponse.json({
      success: true,
      share_id,
      revoked_at: nowIso,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to revoke share code" },
      { status: 500 }
    );
  }
}
