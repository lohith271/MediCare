import { NextResponse } from "next/server";
import { listAccessLogs } from "@/lib/access/log";
import { errorResponse, requireSignedInPatient } from "@/lib/access/patient-access";

export const dynamic = "force-dynamic";

/** The patient's own audit trail. Any patient_id in the query string is ignored. */
export async function GET() {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const logs = await listAccessLogs(auth.user.id);
    return NextResponse.json({ success: true, logs });
  } catch (err) {
    return errorResponse(err, "Failed to fetch access log");
  }
}
