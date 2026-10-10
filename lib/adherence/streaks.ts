import type { DaySchedule } from "./schedule";

export type DayState = "perfect" | "partial" | "missed" | "neutral" | "today";

export interface DayAdherence {
  date: string; // "YYYY-MM-DD"
  state: DayState;
  totalScheduled: number;
  totalTaken: number;
  totalSkipped: number;
  totalMissed: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

export interface AdherenceStats {
  currentStreak: number;
  bestStreak: number;
  adherence30DayRate: number; // 0 - 100
  last7Days: DayAdherence[];
  gentleMessage: string | null;
}

/**
 * Returns formatted YYYY-MM-DD string for a date in Asia/Kolkata timezone.
 */
export function getKolkataDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Returns the state of a specific day for calendar rendering and status checks.
 */
export function getDayState(day: DaySchedule, todayStr: string): DayState {
  if (day.date === todayStr) {
    if (day.totalScheduled === 0) return "neutral";
    if (day.totalTaken === day.totalScheduled) return "perfect";
    return "today";
  }

  if (day.date > todayStr) {
    return "neutral";
  }

  // Past day
  if (day.totalScheduled === 0) {
    return "neutral";
  }
  if (day.totalTaken === day.totalScheduled) {
    return "perfect";
  }
  if (day.totalTaken > 0) {
    return "partial";
  }
  return "missed";
}

/**
 * Pure function to calculate current streak, best streak, and 30-day adherence rate.
 *
 * Rules:
 * - Perfect day = every scheduled dose taken (totalScheduled > 0 && totalTaken === totalScheduled).
 * - Neutral days are skipped (they neither break nor extend a streak).
 * - A partial or missed day breaks it.
 * - Today never breaks the streak while in progress; it extends it only once all of today's doses are taken.
 * - Best streak = longest run in history.
 * - 30-day adherence = taken / scheduled over the last 30 COMPLETED days (excluding today).
 * - Days before the first scheduled day do not count.
 */
export function calculateStreaksAndAdherence(
  allDays: DaySchedule[],
  todayStr: string
): AdherenceStats {
  // Sort days chronologically
  const sortedDays = [...allDays].sort((a, b) => a.date.localeCompare(b.date));

  // Find first day that had at least one scheduled medication
  const firstScheduledIndex = sortedDays.findIndex((d) => d.totalScheduled > 0);
  const relevantDays = firstScheduledIndex === -1 ? [] : sortedDays.slice(firstScheduledIndex);

  let currentRun = 0;
  let bestStreak = 0;
  let hasMissedRecently = false;

  // Track run through completed past days
  for (const day of relevantDays) {
    if (day.date >= todayStr) {
      break; // Stop at today for past calculation
    }

    if (day.totalScheduled === 0) {
      // Neutral day: skipped, neither breaks nor extends
      continue;
    }

    if (day.totalTaken === day.totalScheduled) {
      // Perfect day
      currentRun += 1;
      if (currentRun > bestStreak) {
        bestStreak = currentRun;
      }
    } else {
      // Partial or missed day breaks streak
      currentRun = 0;
    }
  }

  // Current streak before today
  let currentStreak = currentRun;

  // Check today's effect
  const todayDay = relevantDays.find((d) => d.date === todayStr);
  if (todayDay && todayDay.totalScheduled > 0) {
    if (todayDay.totalTaken === todayDay.totalScheduled) {
      // All doses taken today: extends the streak
      currentStreak += 1;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    }
    // If today is in progress (not all taken), today NEVER breaks the streak.
    // currentStreak remains currentRun!
  }

  // Calculate 30-day adherence rate over the last 30 COMPLETED days (excluding today)
  // Get all completed days strictly before todayStr
  const pastDays = relevantDays.filter((d) => d.date < todayStr);
  const last30Completed = pastDays.slice(-30);

  let sumScheduled30 = 0;
  let sumTaken30 = 0;

  for (const d of last30Completed) {
    sumScheduled30 += d.totalScheduled;
    sumTaken30 += d.totalTaken;
  }

  const adherence30DayRate =
    sumScheduled30 > 0 ? Math.round((sumTaken30 / sumScheduled30) * 100) : 100;

  // Check if there was a missed or partial day in the last 7 completed days to display gentle message
  const last7Completed = pastDays.slice(-7);
  const recentBroken = last7Completed.some(
    (d) => d.totalScheduled > 0 && d.totalTaken < d.totalScheduled
  );
  if (recentBroken || currentStreak === 0) {
    hasMissedRecently = true;
  }

  const gentleMessage = hasMissedRecently
    ? "Missing a dose happens — you're doing great, just take the next one as scheduled."
    : null;

  // Build last 7 days strip (including today)
  // Let's create an array of the last 7 calendar days up to today
  const last7Days: DayAdherence[] = [];
  const todayDateObj = new Date(`${todayStr}T00:00:00Z`);

  for (let i = 6; i >= 0; i--) {
    const dObj = new Date(todayDateObj.getTime() - i * 24 * 60 * 60 * 1000);
    const y = dObj.getUTCFullYear();
    const m = String(dObj.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dObj.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const matching = allDays.find((day) => day.date === dateStr);
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    const daySchedule: DaySchedule = matching || {
      date: dateStr,
      doses: [],
      totalScheduled: 0,
      totalTaken: 0,
      totalSkipped: 0,
      totalMissed: 0,
    };

    const state = getDayState(daySchedule, todayStr);

    last7Days.push({
      date: dateStr,
      state,
      totalScheduled: daySchedule.totalScheduled,
      totalTaken: daySchedule.totalTaken,
      totalSkipped: daySchedule.totalSkipped,
      totalMissed: daySchedule.totalMissed,
      isToday,
      isPast,
      isFuture,
    });
  }

  return {
    currentStreak,
    bestStreak,
    adherence30DayRate,
    last7Days,
    gentleMessage,
  };
}
