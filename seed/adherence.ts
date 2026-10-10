export interface DoseLogRecord {
  id: string;
  patient_id: string;
  medication_id: string;
  slot_key: string;
  scheduled_date: string; // YYYY-MM-DD
  status: "taken" | "skipped";
  logged_at: string; // ISO string
}

export interface MedicationScheduleOverrideRecord {
  id: string;
  patient_id: string;
  medication_id: string;
  times: string[];
}

/**
 * Deterministic simulated dose logs for demo-patient-001 covering ~30 days
 * (from 2026-09-15 to 2026-10-10).
 *
 * Pattern:
 * - 2026-09-15 through 2026-10-03: Perfect days (all taken)
 * - 2026-10-04: Partial day (only morning taken)
 * - 2026-10-05: Perfect day
 * - 2026-10-06: Missed day (no logs)
 * - 2026-10-07: Perfect day
 * - 2026-10-08: Perfect day
 * - 2026-10-09: Perfect day (3 consecutive perfect days leading up to today!)
 * - 2026-10-10 (Today): In-progress (Morning metformin & lisinopril taken; spironolactone & evening metformin pending)
 */
function generateDemoDoseLogs(): DoseLogRecord[] {
  const logs: DoseLogRecord[] = [];
  const patient_id = "demo-patient-001";

  // Days 2026-09-15 to 2026-09-27 (med-001 BD, med-003 OD)
  for (let d = 15; d <= 27; d++) {
    const dayStr = `2026-09-${String(d).padStart(2, "0")}`;
    logs.push({
      id: `log-${patient_id}-${dayStr}-med-001-08:00`,
      patient_id,
      medication_id: "med-001",
      slot_key: "08:00",
      scheduled_date: dayStr,
      status: "taken",
      logged_at: `${dayStr}T08:15:00Z`,
    });
    logs.push({
      id: `log-${patient_id}-${dayStr}-med-003-08:00`,
      patient_id,
      medication_id: "med-003",
      slot_key: "08:00",
      scheduled_date: dayStr,
      status: "taken",
      logged_at: `${dayStr}T08:16:00Z`,
    });
    logs.push({
      id: `log-${patient_id}-${dayStr}-med-001-21:00`,
      patient_id,
      medication_id: "med-001",
      slot_key: "21:00",
      scheduled_date: dayStr,
      status: "taken",
      logged_at: `${dayStr}T21:10:00Z`,
    });
  }

  // Days 2026-09-28 to 2026-09-30 (med-002 BD, med-003 OD, med-004 OD) - Perfect days
  for (let d = 28; d <= 30; d++) {
    const dayStr = `2026-09-${String(d).padStart(2, "0")}`;
    logs.push(
      {
        id: `log-${patient_id}-${dayStr}-med-002-08:00`,
        patient_id,
        medication_id: "med-002",
        slot_key: "08:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T08:12:00Z`,
      },
      {
        id: `log-${patient_id}-${dayStr}-med-003-08:00`,
        patient_id,
        medication_id: "med-003",
        slot_key: "08:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T08:14:00Z`,
      },
      {
        id: `log-${patient_id}-${dayStr}-med-004-08:00`,
        patient_id,
        medication_id: "med-004",
        slot_key: "08:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T08:15:00Z`,
      },
      {
        id: `log-${patient_id}-${dayStr}-med-002-21:00`,
        patient_id,
        medication_id: "med-002",
        slot_key: "21:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T21:05:00Z`,
      }
    );
  }

  // Days 2026-10-01 to 2026-10-03: Perfect days
  for (let d = 1; d <= 3; d++) {
    const dayStr = `2026-10-${String(d).padStart(2, "0")}`;
    logs.push(
      {
        id: `log-${patient_id}-${dayStr}-med-002-08:00`,
        patient_id,
        medication_id: "med-002",
        slot_key: "08:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T08:10:00Z`,
      },
      {
        id: `log-${patient_id}-${dayStr}-med-003-08:00`,
        patient_id,
        medication_id: "med-003",
        slot_key: "08:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T08:11:00Z`,
      },
      {
        id: `log-${patient_id}-${dayStr}-med-004-08:00`,
        patient_id,
        medication_id: "med-004",
        slot_key: "08:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T08:12:00Z`,
      },
      {
        id: `log-${patient_id}-${dayStr}-med-002-21:00`,
        patient_id,
        medication_id: "med-002",
        slot_key: "21:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T21:08:00Z`,
      }
    );
  }

  // 2026-10-04: Partial day (morning taken, evening skipped)
  logs.push(
    {
      id: `log-${patient_id}-2026-10-04-med-002-08:00`,
      patient_id,
      medication_id: "med-002",
      slot_key: "08:00",
      scheduled_date: "2026-10-04",
      status: "taken",
      logged_at: "2026-10-04T08:15:00Z",
    },
    {
      id: `log-${patient_id}-2026-10-04-med-003-08:00`,
      patient_id,
      medication_id: "med-003",
      slot_key: "08:00",
      scheduled_date: "2026-10-04",
      status: "taken",
      logged_at: "2026-10-04T08:16:00Z",
    },
    {
      id: `log-${patient_id}-2026-10-04-med-004-08:00`,
      patient_id,
      medication_id: "med-004",
      slot_key: "08:00",
      scheduled_date: "2026-10-04",
      status: "taken",
      logged_at: "2026-10-04T08:17:00Z",
    },
    {
      id: `log-${patient_id}-2026-10-04-med-002-21:00`,
      patient_id,
      medication_id: "med-002",
      slot_key: "21:00",
      scheduled_date: "2026-10-04",
      status: "skipped",
      logged_at: "2026-10-04T21:30:00Z",
    }
  );

  // 2026-10-05: Perfect day
  logs.push(
    {
      id: `log-${patient_id}-2026-10-05-med-002-08:00`,
      patient_id,
      medication_id: "med-002",
      slot_key: "08:00",
      scheduled_date: "2026-10-05",
      status: "taken",
      logged_at: "2026-10-05T08:05:00Z",
    },
    {
      id: `log-${patient_id}-2026-10-05-med-003-08:00`,
      patient_id,
      medication_id: "med-003",
      slot_key: "08:00",
      scheduled_date: "2026-10-05",
      status: "taken",
      logged_at: "2026-10-05T08:06:00Z",
    },
    {
      id: `log-${patient_id}-2026-10-05-med-004-08:00`,
      patient_id,
      medication_id: "med-004",
      slot_key: "08:00",
      scheduled_date: "2026-10-05",
      status: "taken",
      logged_at: "2026-10-05T08:07:00Z",
    },
    {
      id: `log-${patient_id}-2026-10-05-med-002-21:00`,
      patient_id,
      medication_id: "med-002",
      slot_key: "21:00",
      scheduled_date: "2026-10-05",
      status: "taken",
      logged_at: "2026-10-05T21:10:00Z",
    }
  );

  // 2026-10-06: Missed day (0 logs)

  // 2026-10-07, 2026-10-08, 2026-10-09: 3 Perfect Days
  for (let d = 7; d <= 9; d++) {
    const dayStr = `2026-10-${String(d).padStart(2, "0")}`;
    logs.push(
      {
        id: `log-${patient_id}-${dayStr}-med-002-08:00`,
        patient_id,
        medication_id: "med-002",
        slot_key: "08:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T08:05:00Z`,
      },
      {
        id: `log-${patient_id}-${dayStr}-med-003-08:00`,
        patient_id,
        medication_id: "med-003",
        slot_key: "08:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T08:06:00Z`,
      },
      {
        id: `log-${patient_id}-${dayStr}-med-004-08:00`,
        patient_id,
        medication_id: "med-004",
        slot_key: "08:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T08:07:00Z`,
      },
      {
        id: `log-${patient_id}-${dayStr}-med-002-21:00`,
        patient_id,
        medication_id: "med-002",
        slot_key: "21:00",
        scheduled_date: dayStr,
        status: "taken",
        logged_at: `${dayStr}T21:10:00Z`,
      }
    );
  }

  // 2026-10-10: Today in progress (Morning doses taken)
  logs.push(
    {
      id: `log-${patient_id}-2026-10-10-med-002-08:00`,
      patient_id,
      medication_id: "med-002",
      slot_key: "08:00",
      scheduled_date: "2026-10-10",
      status: "taken",
      logged_at: "2026-10-10T08:10:00Z",
    },
    {
      id: `log-${patient_id}-2026-10-10-med-003-08:00`,
      patient_id,
      medication_id: "med-003",
      slot_key: "08:00",
      scheduled_date: "2026-10-10",
      status: "taken",
      logged_at: "2026-10-10T08:12:00Z",
    }
  );

  return logs;
}

// In-memory store for demo simulated sessions
export const DEMO_DOSE_LOGS: DoseLogRecord[] = generateDemoDoseLogs();
export const DEMO_SCHEDULE_OVERRIDES: Record<string, MedicationScheduleOverrideRecord> = {};

export function getDemoDoseLogs(patientId: string): DoseLogRecord[] {
  return DEMO_DOSE_LOGS.filter((l) => l.patient_id === patientId);
}

export function saveDemoDoseLog(log: Omit<DoseLogRecord, "id" | "logged_at">): DoseLogRecord {
  const existingIdx = DEMO_DOSE_LOGS.findIndex(
    (l) =>
      l.patient_id === log.patient_id &&
      l.medication_id === log.medication_id &&
      l.slot_key === log.slot_key &&
      l.scheduled_date === log.scheduled_date
  );

  const logged_at = new Date().toISOString();
  if (existingIdx >= 0) {
    DEMO_DOSE_LOGS[existingIdx] = {
      ...DEMO_DOSE_LOGS[existingIdx],
      status: log.status,
      logged_at,
    };
    return DEMO_DOSE_LOGS[existingIdx];
  }

  const record: DoseLogRecord = {
    id: `log-${log.patient_id}-${log.scheduled_date}-${log.medication_id}-${log.slot_key}`,
    ...log,
    logged_at,
  };
  DEMO_DOSE_LOGS.push(record);
  return record;
}

export function deleteDemoDoseLog(
  patientId: string,
  medicationId: string,
  slotKey: string,
  scheduledDate: string
): boolean {
  const idx = DEMO_DOSE_LOGS.findIndex(
    (l) =>
      l.patient_id === patientId &&
      l.medication_id === medicationId &&
      l.slot_key === slotKey &&
      l.scheduled_date === scheduledDate
  );
  if (idx >= 0) {
    DEMO_DOSE_LOGS.splice(idx, 1);
    return true;
  }
  return false;
}

export function getDemoOverrides(patientId: string): Record<string, string[]> {
  const res: Record<string, string[]> = {};
  for (const key of Object.keys(DEMO_SCHEDULE_OVERRIDES)) {
    const o = DEMO_SCHEDULE_OVERRIDES[key];
    if (o.patient_id === patientId) {
      res[o.medication_id] = o.times;
    }
  }
  return res;
}

export function saveDemoOverride(
  patientId: string,
  medicationId: string,
  times: string[]
): MedicationScheduleOverrideRecord {
  const rec: MedicationScheduleOverrideRecord = {
    id: `override-${patientId}-${medicationId}`,
    patient_id: patientId,
    medication_id: medicationId,
    times,
  };
  DEMO_SCHEDULE_OVERRIDES[`${patientId}:${medicationId}`] = rec;
  return rec;
}
