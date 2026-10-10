import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolvePatientContext, persistDoseLog } from "../loader";
import { getKolkataDateString } from "@/lib/adherence";

export const dynamic = "force-dynamic";

const LogSchema = z.object({
  medication_id: z.string().min(1, "medication_id is required"),
  slot_key: z.string().min(1, "slot_key is required"),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "scheduled_date must be YYYY-MM-DD"),
  status: z.enum(["taken", "skipped"]),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = LogSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { medication_id, slot_key, scheduled_date, status } = parsed.data;

    // Resolve context & check ownership
    const { error, context } = await resolvePatientContext();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (!context) {
      return NextResponse.json({ error: "Context not found" }, { status: 404 });
    }

    // Verify medication belongs to patient
    const ownsMed = context.medications.some((m) => m.id === medication_id);
    if (!ownsMed) {
      return NextResponse.json(
        { error: "Forbidden: Medication does not belong to this patient" },
        { status: 403 }
      );
    }

    // Date validation: today and previous 7 days only
    const todayParam = request.nextUrl.searchParams.get("today");
    const todayStr = todayParam || getKolkataDateString();

    const todayMs = new Date(`${todayStr}T00:00:00Z`).getTime();
    const scheduledMs = new Date(`${scheduled_date}T00:00:00Z`).getTime();
    const daysDiff = Math.round((todayMs - scheduledMs) / (24 * 60 * 60 * 1000));

    if (daysDiff < 0) {
      return NextResponse.json(
        { error: "Future doses cannot be logged" },
        { status: 400 }
      );
    }

    if (daysDiff > 7) {
      return NextResponse.json(
        { error: "Doses can only be logged for today and the previous 7 days" },
        { status: 400 }
      );
    }

    // Persist dose log (idempotent / reversible)
    const result = await persistDoseLog(context, {
      medication_id,
      slot_key,
      scheduled_date,
      status,
    });

    return NextResponse.json({
      success: true,
      action: result.action,
      log: result.record || null,
      scheduled_date,
      slot_key,
      medication_id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to log dose" }, { status: 500 });
  }
}
