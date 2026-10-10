import { NextRequest, NextResponse } from "next/server";
import { resolvePatientAccess } from "@/lib/access/patient-access";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Gate: only the patient in the URL, or a valid share/emergency token for that same patient.
async function gate(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const access = await resolvePatientAccess(req, "all");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.patientId !== id) {
    return NextResponse.json({ error: "Forbidden: not this patient's record" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const denied = await gate(req, context);
  if (denied) return denied;
  return NextResponse.json({ status: "placeholder" });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const denied = await gate(req, context);
  if (denied) return denied;
  return NextResponse.json({ status: "placeholder" });
}
