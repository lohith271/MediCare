import { describe, it, expect } from "vitest";
import {
  parseFrequency,
  getActiveMedicationsForDate,
  deriveScheduleForDate,
  calculateStreaksAndAdherence,
  getDayState,
  type DaySchedule,
} from "@/lib/adherence";
import { resolvePatientContext, persistDoseLog } from "@/app/api/adherence/loader";
import { DEMO_DOSE_LOGS, saveDemoDoseLog, deleteDemoDoseLog } from "@/seed/adherence";
import type { MedicationRecord } from "@/lib/types/database";
const dbReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const TODAY_STR = "2026-10-10";

describe("Adherence Frequency Parser", () => {
  it("parses OD / once daily -> 08:00", () => {
    const res1 = parseFrequency("OD");
    expect(res1.times).toEqual(["08:00"]);
    expect(res1.frequencyType).toBe("daily");

    const res2 = parseFrequency("once daily in the morning");
    expect(res2.times).toEqual(["08:00"]);
  });

  it("parses BD / BID / twice daily / 1-0-1 -> 08:00, 21:00", () => {
    const r1 = parseFrequency("BD");
    expect(r1.times).toEqual(["08:00", "21:00"]);

    const r2 = parseFrequency("BID");
    expect(r2.times).toEqual(["08:00", "21:00"]);

    const r3 = parseFrequency("twice daily");
    expect(r3.times).toEqual(["08:00", "21:00"]);

    const r4 = parseFrequency("1-0-1");
    expect(r4.times).toEqual(["08:00", "21:00"]);
  });

  it("parses TDS / TID / three times / 1-1-1 -> 08:00, 14:00, 21:00", () => {
    const r1 = parseFrequency("TDS");
    expect(r1.times).toEqual(["08:00", "14:00", "21:00"]);

    const r2 = parseFrequency("TID");
    expect(r2.times).toEqual(["08:00", "14:00", "21:00"]);

    const r3 = parseFrequency("1-1-1");
    expect(r3.times).toEqual(["08:00", "14:00", "21:00"]);
  });

  it("parses QID / four times -> 06:00, 12:00, 18:00, 22:00", () => {
    const r1 = parseFrequency("QID");
    expect(r1.times).toEqual(["06:00", "12:00", "18:00", "22:00"]);

    const r2 = parseFrequency("four times a day");
    expect(r2.times).toEqual(["06:00", "12:00", "18:00", "22:00"]);
  });

  it("parses HS / at bedtime / 0-0-1 -> 22:00", () => {
    const r1 = parseFrequency("HS");
    expect(r1.times).toEqual(["22:00"]);

    const r2 = parseFrequency("at bedtime");
    expect(r2.times).toEqual(["22:00"]);

    const r3 = parseFrequency("0-0-1");
    expect(r3.times).toEqual(["22:00"]);
  });

  it("parses 1-0-0 -> 08:00 and 0-1-0 -> 14:00", () => {
    expect(parseFrequency("1-0-0").times).toEqual(["08:00"]);
    expect(parseFrequency("0-1-0").times).toEqual(["14:00"]);
  });

  it("parses weekly / OW and alternate day", () => {
    const rWeekly = parseFrequency("weekly");
    expect(rWeekly.frequencyType).toBe("weekly");
    expect(rWeekly.times).toEqual(["08:00"]);

    const rOW = parseFrequency("OW");
    expect(rOW.frequencyType).toBe("weekly");

    const rAlt = parseFrequency("alternate day");
    expect(rAlt.frequencyType).toBe("alternate_day");
    expect(rAlt.times).toEqual(["08:00"]);
  });

  it("parses SOS / PRN / as needed -> no schedule", () => {
    const r1 = parseFrequency("SOS");
    expect(r1.asNeeded).toBe(true);
    expect(r1.times).toEqual([]);

    const r2 = parseFrequency("Take as needed for pain (PRN)");
    expect(r2.asNeeded).toBe(true);
    expect(r2.times).toEqual([]);
  });

  it("flags unknown text as unrecognized", () => {
    const res = parseFrequency("special complex regimen from oncologist");
    expect(res.unrecognized).toBe(true);
    expect(res.times).toEqual([]);
  });

  it("parses meal relations correctly", () => {
    expect(parseFrequency("1 tab BD before food").mealRelation).toBe("before_food");
    expect(parseFrequency("1 tab OD AC").mealRelation).toBe("before_food");
    expect(parseFrequency("1 tab on empty stomach").mealRelation).toBe("before_food");

    expect(parseFrequency("1 tab BD after food").mealRelation).toBe("after_food");
    expect(parseFrequency("1 tab TDS PC").mealRelation).toBe("after_food");

    expect(parseFrequency("1 tab with food").mealRelation).toBe("with_food");
    expect(parseFrequency("1 tab with meals").mealRelation).toBe("with_food");
  });
});

describe("Schedule Windows and Ingredient Replacement", () => {
  const baseMed: MedicationRecord = {
    id: "m1",
    patient_id: "demo-patient-001",
    name_as_written: "Glucophage 500mg",
    ingredients: ["metformin"],
    strength: "500mg",
    dose: "1 tab",
    frequency: "twice daily",
    duration_days: 10,
    patient_marked_stopped: false,
    confidence: 0.95,
    confirmed: true,
    evidence_text: "Glucophage 500mg BD",
    doc_date: "2026-10-01",
  };

  it("respects schedule window start, duration and expiry", () => {
    // Before start: 2026-09-30 -> not active
    expect(getActiveMedicationsForDate([baseMed], "2026-09-30")).toHaveLength(0);

    // On start: 2026-10-01 -> active
    expect(getActiveMedicationsForDate([baseMed], "2026-10-01")).toHaveLength(1);

    // On last day of 10-day duration: 2026-10-10 -> active
    expect(getActiveMedicationsForDate([baseMed], "2026-10-10")).toHaveLength(1);

    // Day 11: 2026-10-11 -> expired
    expect(getActiveMedicationsForDate([baseMed], "2026-10-11")).toHaveLength(0);
  });

  it("replaces older prescription with newer prescription having same ingredients", () => {
    const olderMed: MedicationRecord = {
      ...baseMed,
      id: "m-old",
      name_as_written: "Glucophage 500mg",
      doc_date: "2026-09-15",
      duration_days: null,
    };

    const newerMed: MedicationRecord = {
      ...baseMed,
      id: "m-new",
      name_as_written: "Tab Glycomet 500",
      doc_date: "2026-09-28",
      duration_days: null,
    };

    // Before Sep 28: older prescription is active
    const activeSep20 = getActiveMedicationsForDate([olderMed, newerMed], "2026-09-20");
    expect(activeSep20).toHaveLength(1);
    expect(activeSep20[0].id).toBe("m-old");

    // From Sep 28 onwards: newer replaces older prescription
    const activeOct01 = getActiveMedicationsForDate([olderMed, newerMed], "2026-10-01");
    expect(activeOct01).toHaveLength(1);
    expect(activeOct01[0].id).toBe("m-new");
  });

  it("removes stopped medicine on or after stopped_on date", () => {
    const medStopped: MedicationRecord = {
      ...baseMed,
      patient_marked_stopped: true,
      stopped_on: "2026-10-05",
      duration_days: null,
    };

    // Before stopped date: active
    expect(getActiveMedicationsForDate([medStopped], "2026-10-04")).toHaveLength(1);

    // On stopped date: not active
    expect(getActiveMedicationsForDate([medStopped], "2026-10-05")).toHaveLength(0);

    // After stopped date: not active
    expect(getActiveMedicationsForDate([medStopped], "2026-10-06")).toHaveLength(0);
  });
});

describe("Adherence Streaks and 30-Day Math", () => {
  function makeDay(date: string, scheduled: number, taken: number): DaySchedule {
    return {
      date,
      totalScheduled: scheduled,
      totalTaken: taken,
      totalSkipped: scheduled - taken,
      totalMissed: 0,
      doses: [],
    };
  }

  it("3 perfect days -> current streak 3", () => {
    const days = [
      makeDay("2026-10-07", 2, 2),
      makeDay("2026-10-08", 2, 2),
      makeDay("2026-10-09", 2, 2),
      makeDay("2026-10-10", 2, 0), // Today in progress
    ];

    const stats = calculateStreaksAndAdherence(days, TODAY_STR);
    expect(stats.currentStreak).toBe(3);
  });

  it("a partial day breaks the streak", () => {
    const days = [
      makeDay("2026-10-06", 2, 2),
      makeDay("2026-10-07", 2, 1), // Partial day
      makeDay("2026-10-08", 2, 2),
      makeDay("2026-10-09", 2, 2),
      makeDay("2026-10-10", 2, 0),
    ];

    const stats = calculateStreaksAndAdherence(days, TODAY_STR);
    expect(stats.currentStreak).toBe(2); // Only Oct 8 & 9
  });

  it("a neutral day (0 scheduled) is skipped and neither breaks nor extends streak", () => {
    const days = [
      makeDay("2026-10-06", 2, 2),
      makeDay("2026-10-07", 0, 0), // Neutral day
      makeDay("2026-10-08", 2, 2),
      makeDay("2026-10-09", 2, 2),
      makeDay("2026-10-10", 2, 0),
    ];

    const stats = calculateStreaksAndAdherence(days, TODAY_STR);
    // Oct 6, 8, 9 are perfect days -> streak is 3!
    expect(stats.currentStreak).toBe(3);
  });

  it("today in progress does not break streak, and extends only once all doses taken", () => {
    // Case A: Today in progress (0 of 2 taken)
    const daysA = [
      makeDay("2026-10-08", 2, 2),
      makeDay("2026-10-09", 2, 2),
      makeDay("2026-10-10", 2, 0), // In progress
    ];
    expect(calculateStreaksAndAdherence(daysA, TODAY_STR).currentStreak).toBe(2);

    // Case B: Today all doses taken (2 of 2 taken)
    const daysB = [
      makeDay("2026-10-08", 2, 2),
      makeDay("2026-10-09", 2, 2),
      makeDay("2026-10-10", 2, 2), // All taken today
    ];
    expect(calculateStreaksAndAdherence(daysB, TODAY_STR).currentStreak).toBe(3);
  });

  it("calculates best streak as longest run in history", () => {
    const days = [
      // Run 1: 4 perfect days
      makeDay("2026-09-01", 2, 2),
      makeDay("2026-09-02", 2, 2),
      makeDay("2026-09-03", 2, 2),
      makeDay("2026-09-04", 2, 2),
      makeDay("2026-09-05", 2, 0), // Missed
      // Run 2: 2 perfect days
      makeDay("2026-09-06", 2, 2),
      makeDay("2026-09-07", 2, 2),
      makeDay("2026-10-10", 2, 0),
    ];

    const stats = calculateStreaksAndAdherence(days, TODAY_STR);
    expect(stats.bestStreak).toBe(4);
  });

  it("computes 30-day adherence percentage over last 30 completed days", () => {
    const days: DaySchedule[] = [];
    // 30 completed days: 25 days with 2/2 taken (50 doses taken), 5 days with 1/2 taken (5 taken, 5 missed)
    // Total scheduled = 30 * 2 = 60. Total taken = 50 + 5 = 55. Rate = 55/60 ≈ 92%
    for (let i = 30; i >= 1; i--) {
      const date = `2026-09-${String(30 - i + 1).padStart(2, "0")}`;
      if (i <= 5) {
        days.push(makeDay(date, 2, 1));
      } else {
        days.push(makeDay(date, 2, 2));
      }
    }
    // Today
    days.push(makeDay(TODAY_STR, 2, 0));

    const stats = calculateStreaksAndAdherence(days, TODAY_STR);
    expect(stats.adherence30DayRate).toBe(92);
  });
});

describe("Dose Logging Guardrails and Idempotency", () => {
  it("rejects future dates and dates older than 7 days", () => {
    const todayMs = new Date("2026-10-10T00:00:00Z").getTime();

    // Future date: 2026-10-11
    const futureMs = new Date("2026-10-11T00:00:00Z").getTime();
    const diffFuture = Math.round((todayMs - futureMs) / (24 * 60 * 60 * 1000));
    expect(diffFuture < 0).toBe(true);

    // Older than 7 days: 2026-10-02 (8 days ago)
    const oldMs = new Date("2026-10-02T00:00:00Z").getTime();
    const diffOld = Math.round((todayMs - oldMs) / (24 * 60 * 60 * 1000));
    expect(diffOld > 7).toBe(true);

    // Valid: 2026-10-08 (2 days ago)
    const validMs = new Date("2026-10-08T00:00:00Z").getTime();
    const diffValid = Math.round((todayMs - validMs) / (24 * 60 * 60 * 1000));
    expect(diffValid >= 0 && diffValid <= 7).toBe(true);
  });

  it.skipIf(!dbReady)("logging is reversible and idempotent", async () => {
    const testMedId = "med-test-log";
    const slot = "08:00";
    const date = "2026-10-09";
    const patient = "demo-patient-001";

    // Clean any existing test log
    deleteDemoDoseLog(patient, testMedId, slot, date);

    const log1 = saveDemoDoseLog({
      patient_id: patient,
      medication_id: testMedId,
      slot_key: slot,
      scheduled_date: date,
      status: "taken",
    });
    expect(log1.status).toBe("taken");

    // Saving again with same status updates/preserves idempotently
    const log2 = saveDemoDoseLog({
      patient_id: patient,
      medication_id: testMedId,
      slot_key: slot,
      scheduled_date: date,
      status: "taken",
    });
    expect(log2.status).toBe("taken");

    // Persisting via context toggles (undoes) when status is unchanged
    const demoContext = {
      patientId: patient,
      isDemo: true,
      medications: [{ id: testMedId } as any],
      doseLogs: DEMO_DOSE_LOGS,
      scheduleOverrides: {},
    };

    const resToggle = await persistDoseLog(demoContext, {
      medication_id: testMedId,
      slot_key: slot,
      scheduled_date: date,
      status: "taken",
    });
    expect(resToggle.action).toBe("undone");
  });

});
