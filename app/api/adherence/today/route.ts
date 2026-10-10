import { NextRequest, NextResponse } from "next/server";
import { resolvePatientContext } from "../loader";
import {
  deriveScheduleForDate,
  getActiveMedicationsForDate,
  parseFrequency,
  getKolkataDateString,
  type ScheduledDose,
} from "@/lib/adherence";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const requestedPatientId = request.nextUrl.searchParams.get("patient_id");
    const { error, context } = await resolvePatientContext(requestedPatientId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (!context) {
      return NextResponse.json({ error: "Context not found" }, { status: 404 });
    }

    const todayParam = request.nextUrl.searchParams.get("today");
    const targetDate = todayParam || getKolkataDateString();

    // Derive schedule for target date
    const daySchedule = deriveScheduleForDate(
      targetDate,
      context.medications,
      context.doseLogs,
      context.scheduleOverrides,
      new Date()
    );

    // Group doses by slotPeriod
    const groupedDoses = {
      Morning: daySchedule.doses.filter((d) => d.slotPeriod === "Morning"),
      Afternoon: daySchedule.doses.filter((d) => d.slotPeriod === "Afternoon"),
      Evening: daySchedule.doses.filter((d) => d.slotPeriod === "Evening"),
      Night: daySchedule.doses.filter((d) => d.slotPeriod === "Night"),
    };

    // Find next dose due: first dose that is due_now, overdue, or upcoming and not yet taken/skipped
    const pendingDoses = daySchedule.doses.filter(
      (d) => d.status !== "taken" && d.status !== "skipped"
    );
    // Sort to prioritize due_now, then overdue, then upcoming by time
    const nextDose: ScheduledDose | null =
      pendingDoses.find((d) => d.status === "due_now") ||
      pendingDoses.find((d) => d.status === "overdue") ||
      pendingDoses[0] ||
      null;

    // Collect As-needed (SOS/PRN) & Unrecognized medications active on targetDate
    const activeMeds = getActiveMedicationsForDate(context.medications, targetDate);
    const asNeededMeds: any[] = [];
    const unrecognizedMeds: any[] = [];

    for (const med of activeMeds) {
      const parsed = parseFrequency(med.frequency);
      const hasOverride = !!context.scheduleOverrides[med.id];

      if (parsed.frequencyType === "as_needed" || parsed.asNeeded) {
        asNeededMeds.push({
          id: med.id,
          name_as_written: med.name_as_written,
          strength: med.strength || null,
          dose: med.dose || "1 dose",
          frequency: med.frequency,
        });
      } else if (parsed.unrecognized && !hasOverride) {
        unrecognizedMeds.push({
          id: med.id,
          name_as_written: med.name_as_written,
          strength: med.strength || null,
          dose: med.dose || "1 dose",
          frequency: med.frequency,
        });
      }
    }

    const percentage =
      daySchedule.totalScheduled > 0
        ? Math.round((daySchedule.totalTaken / daySchedule.totalScheduled) * 100)
        : 100;

    return NextResponse.json({
      date: targetDate,
      patientId: context.patientId,
      isDemo: context.isDemo,
      nextDose,
      totalScheduled: daySchedule.totalScheduled,
      totalTaken: daySchedule.totalTaken,
      totalSkipped: daySchedule.totalSkipped,
      totalRemaining: Math.max(
        0,
        daySchedule.totalScheduled - daySchedule.totalTaken - daySchedule.totalSkipped
      ),
      progressPercent: percentage,
      groupedDoses,
      asNeededMeds,
      unrecognizedMeds,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch today's doses" }, { status: 500 });
  }
}
