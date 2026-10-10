import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolvePatientContext, persistScheduleOverride } from "../../loader";

export const dynamic = "force-dynamic";

const ScheduleOverrideSchema = z.object({
  times: z
    .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM format"))
    .min(1, "At least one scheduled time is required")
    .max(4, "Cannot specify more than 4 times per day"),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ medicationId: string }> }
) {
  try {
    const { medicationId } = await params;
    const rawBody = await request.json();
    const parsed = ScheduleOverrideSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid schedule override payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { times } = parsed.data;

    // Resolve patient context & check ownership
    const { error, context } = await resolvePatientContext();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (!context) {
      return NextResponse.json({ error: "Context not found" }, { status: 404 });
    }

    // Verify medication belongs to patient
    const ownsMed = context.medications.some((m) => m.id === medicationId);
    if (!ownsMed) {
      return NextResponse.json(
        { error: "Forbidden: Medication does not belong to this patient" },
        { status: 403 }
      );
    }

    // Save override without altering prescription record
    await persistScheduleOverride(context, medicationId, times);

    return NextResponse.json({
      success: true,
      medicationId,
      times,
      message: "Schedule override saved successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update schedule override" },
      { status: 500 }
    );
  }
}
