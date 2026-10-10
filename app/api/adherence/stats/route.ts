import { NextRequest, NextResponse } from "next/server";
import { resolvePatientContext } from "../loader";
import {
  deriveScheduleForDate,
  calculateStreaksAndAdherence,
  getKolkataDateString,
  type DaySchedule,
} from "@/lib/adherence";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { error, context } = await resolvePatientContext();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (!context) {
      return NextResponse.json({ error: "Context not found" }, { status: 404 });
    }

    const todayParam = request.nextUrl.searchParams.get("today");
    const todayStr = todayParam || getKolkataDateString();

    // To compute 30-day adherence and streaks accurately, look back 90 days from today
    const todayObj = new Date(`${todayStr}T00:00:00Z`);
    const daySchedules: DaySchedule[] = [];

    // From 90 days ago up to today
    for (let i = 90; i >= 0; i--) {
      const d = new Date(todayObj.getTime() - i * 24 * 60 * 60 * 1000);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;

      const schedule = deriveScheduleForDate(
        dateStr,
        context.medications,
        context.doseLogs,
        context.scheduleOverrides,
        new Date()
      );
      daySchedules.push(schedule);
    }

    const stats = calculateStreaksAndAdherence(daySchedules, todayStr);

    return NextResponse.json({
      today: todayStr,
      patientId: context.patientId,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      adherence30DayRate: stats.adherence30DayRate,
      last7Days: stats.last7Days,
      gentleMessage: stats.gentleMessage,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to calculate stats" }, { status: 500 });
  }
}
