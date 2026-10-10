import { NextRequest, NextResponse } from "next/server";
import { resolvePatientContext } from "../loader";
import {
  deriveScheduleForDate,
  getDayState,
  getKolkataDateString,
  type DaySchedule,
  type DayState,
} from "@/lib/adherence";

export const dynamic = "force-dynamic";

export interface CalendarDayItem {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  state: DayState;
  totalScheduled: number;
  totalTaken: number;
  totalSkipped: number;
  totalMissed: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  doses: DaySchedule["doses"];
}

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

    const monthParam = request.nextUrl.searchParams.get("month");
    // Default to month of todayStr
    const [todayYear, todayMonth] = todayStr.split("-").map((v) => parseInt(v, 10));
    let year = todayYear;
    let month = todayMonth;

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [mYear, mMonth] = monthParam.split("-").map((v) => parseInt(v, 10));
      year = mYear;
      month = mMonth;
    }

    // Number of days in the requested month
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const days: CalendarDayItem[] = [];

    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
      const dayDateObj = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dayDateObj.getUTCDay();

      const daySchedule = deriveScheduleForDate(
        dateStr,
        context.medications,
        context.doseLogs,
        context.scheduleOverrides,
        new Date()
      );

      const state = getDayState(daySchedule, todayStr);
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;

      days.push({
        date: dateStr,
        dayNumber: day,
        dayOfWeek,
        state,
        totalScheduled: daySchedule.totalScheduled,
        totalTaken: daySchedule.totalTaken,
        totalSkipped: daySchedule.totalSkipped,
        totalMissed: daySchedule.totalMissed,
        isToday,
        isPast,
        isFuture,
        doses: daySchedule.doses,
      });
    }

    return NextResponse.json({
      month: monthStr,
      today: todayStr,
      days,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load calendar" }, { status: 500 });
  }
}
