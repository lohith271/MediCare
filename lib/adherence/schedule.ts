import type { MedicationRecord } from "@/lib/types/database";
import { cleanMedicineName, resolveIngredients } from "@/lib/normalize";
import { parseFrequency, type ParsedFrequency } from "./parseFrequency";

export type DoseStatus = "upcoming" | "due_now" | "overdue" | "taken" | "skipped" | "missed";

export interface ScheduledDose {
  doseId: string; // unique key: `${medicationId}-${slotKey}-${date}`
  medicationId: string;
  medicineName: string;
  strength: string | null;
  dose: string | null;
  scheduledTime: string; // "08:00"
  slotKey: string; // "08:00"
  slotPeriod: "Morning" | "Afternoon" | "Evening" | "Night";
  mealRelationLabel: string | null;
  scheduledDate: string; // "YYYY-MM-DD"
  status: DoseStatus;
  loggedAt?: string | null;
  instructions?: string | null;
}

export interface DaySchedule {
  date: string; // "YYYY-MM-DD"
  doses: ScheduledDose[];
  totalScheduled: number;
  totalTaken: number;
  totalSkipped: number;
  totalMissed: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnly(d?: string | null): Date | null {
  if (!d) return null;
  const parts = d.split("T")[0].split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(Date.UTC(year, month, day));
}

function formatDateString(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getSlotPeriod(timeStr: string): "Morning" | "Afternoon" | "Evening" | "Night" {
  const hour = parseInt(timeStr.split(":")[0], 10);
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

/**
 * Filters and resolves active medication records on a given date D,
 * taking into account duration, 90-day window, stopped_on dates,
 * and replacing older prescriptions with newer prescriptions of the same ingredients.
 */
export function getActiveMedicationsForDate(
  meds: MedicationRecord[],
  targetDateStr: string
): MedicationRecord[] {
  const targetDate = parseDateOnly(targetDateStr);
  if (!targetDate) return [];

  // Group medications by ingredient key
  const groups = new Map<string, MedicationRecord[]>();

  for (const med of meds) {
    if (med.confirmed === false) continue;

    const prescribedDate = parseDateOnly(med.doc_date || med.created_at);
    if (!prescribedDate) continue;

    // Check if targetDate is before prescribed_on
    if (targetDate.getTime() < prescribedDate.getTime()) continue;

    // Check stopped_on condition
    if (med.patient_marked_stopped && med.stopped_on) {
      const stoppedDate = parseDateOnly(med.stopped_on);
      if (stoppedDate && targetDate.getTime() >= stoppedDate.getTime()) {
        continue;
      }
    } else if (med.patient_marked_stopped && !med.stopped_on) {
      // If marked stopped without explicit date, treat prescribed date as cutoff
      continue;
    }

    // Check duration / 90 days window
    if (typeof med.duration_days === "number" && med.duration_days > 0) {
      const expiryTime = prescribedDate.getTime() + (med.duration_days - 1) * MS_PER_DAY;
      if (targetDate.getTime() > expiryTime) continue;
    } else {
      const windowEnd = prescribedDate.getTime() + 90 * MS_PER_DAY;
      if (targetDate.getTime() > windowEnd) continue;
    }

    const ingredients = resolveIngredients(med.name_as_written, med.ingredients);
    const cleaned = cleanMedicineName(med.name_as_written);
    const key = ingredients.length > 0 ? ingredients.sort().join("+") : cleaned || med.id;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(med);
  }

  const active: MedicationRecord[] = [];

  // For each ingredient group, a newer prescription replaces older ones from its own prescribed_on date
  for (const [, groupMeds] of groups) {
    // Sort descending by prescribed_on
    groupMeds.sort((a, b) => {
      const da = parseDateOnly(a.doc_date || a.created_at)?.getTime() || 0;
      const db = parseDateOnly(b.doc_date || b.created_at)?.getTime() || 0;
      return db - da;
    });

    // Pick the newest prescription whose prescribed_on <= targetDate
    const latestForTarget = groupMeds.find((m) => {
      const pDate = parseDateOnly(m.doc_date || m.created_at);
      return pDate && pDate.getTime() <= targetDate.getTime();
    });

    if (latestForTarget) {
      active.push(latestForTarget);
    }
  }

  return active;
}

/**
 * Derives scheduled doses for a specific date, merging parsed frequency
 * or schedule overrides with logged status from dose_logs.
 */
export function deriveScheduleForDate(
  dateStr: string,
  meds: MedicationRecord[],
  doseLogs: Array<{ medication_id: string; slot_key: string; scheduled_date: string; status: string; logged_at?: string }>,
  scheduleOverrides: Record<string, string[]> = {},
  now: Date = new Date()
): DaySchedule {
  const activeMeds = getActiveMedicationsForDate(meds, dateStr);
  const targetDate = parseDateOnly(dateStr);
  const nowDateOnly = parseDateOnly(formatDateString(now));

  const isToday = targetDate && nowDateOnly && targetDate.getTime() === nowDateOnly.getTime();
  const isPast = targetDate && nowDateOnly && targetDate.getTime() < nowDateOnly.getTime();

  // Current time in minutes from midnight for today's due now/overdue checks
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const doses: ScheduledDose[] = [];

  for (const med of activeMeds) {
    const parsed = parseFrequency(med.frequency);

    // Times: use override if present, else parsed times
    let times = scheduleOverrides[med.id] || parsed.times;

    // Handle alternate day or weekly
    const prescribedDate = parseDateOnly(med.doc_date || med.created_at);
    if (parsed.frequencyType === "alternate_day" && prescribedDate && targetDate) {
      const daysDiff = Math.round((targetDate.getTime() - prescribedDate.getTime()) / MS_PER_DAY);
      if (daysDiff % 2 !== 0) {
        continue; // Not on this day
      }
    } else if (parsed.frequencyType === "weekly" && prescribedDate && targetDate) {
      if (targetDate.getUTCDay() !== prescribedDate.getUTCDay()) {
        continue; // Not this day of week
      }
    } else if (parsed.frequencyType === "as_needed" || parsed.asNeeded) {
      // SOS / As needed: not on regular fixed schedule
      continue;
    }

    if (!times || times.length === 0) continue;

    for (const timeStr of times) {
      const slotKey = timeStr;
      const doseId = `${med.id}-${slotKey}-${dateStr}`;

      // Check if logged in dose_logs
      const log = doseLogs.find(
        (l) =>
          l.medication_id === med.id &&
          l.slot_key === slotKey &&
          l.scheduled_date.startsWith(dateStr)
      );

      let status: DoseStatus = "upcoming";

      if (log) {
        status = log.status === "taken" ? "taken" : "skipped";
      } else if (isPast) {
        status = "missed";
      } else if (isToday) {
        const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10));
        const scheduledMinutes = (h || 0) * 60 + (m || 0);

        if (currentMinutes < scheduledMinutes - 60) {
          status = "upcoming";
        } else if (
          currentMinutes >= scheduledMinutes - 60 &&
          currentMinutes <= scheduledMinutes + 120
        ) {
          status = "due_now";
        } else {
          status = "overdue";
        }
      }

      doses.push({
        doseId,
        medicationId: med.id,
        medicineName: med.name_as_written,
        strength: med.strength || null,
        dose: med.dose || "1 dose",
        scheduledTime: timeStr,
        slotKey,
        slotPeriod: getSlotPeriod(timeStr),
        mealRelationLabel: parsed.mealRelationLabel,
        scheduledDate: dateStr,
        status,
        loggedAt: log?.logged_at || null,
        instructions: med.frequency || null,
      });
    }
  }

  // Sort chronologically by scheduled time
  doses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const totalScheduled = doses.length;
  const totalTaken = doses.filter((d) => d.status === "taken").length;
  const totalSkipped = doses.filter((d) => d.status === "skipped").length;
  const totalMissed = doses.filter((d) => d.status === "missed").length;

  return {
    date: dateStr,
    doses,
    totalScheduled,
    totalTaken,
    totalSkipped,
    totalMissed,
  };
}
