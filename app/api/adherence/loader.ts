import { createClient } from "@/lib/supabase/server";
import { DEMO_PATIENTS_DATA } from "@/seed/patients";
import {
  DEMO_DOSE_LOGS,
  getDemoDoseLogs,
  saveDemoDoseLog,
  deleteDemoDoseLog,
  getDemoOverrides,
  saveDemoOverride,
  type DoseLogRecord,
} from "@/seed/adherence";
import type { MedicationRecord } from "@/lib/types/database";

export interface PatientAdherenceContext {
  patientId: string;
  isDemo: boolean;
  medications: MedicationRecord[];
  doseLogs: DoseLogRecord[];
  scheduleOverrides: Record<string, string[]>;
}

export async function resolvePatientContext(
  requestedPatientId?: string | null
): Promise<{ error?: { status: number; message: string }; context?: PatientAdherenceContext }> {
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const res = await supabase.auth.getUser();
    user = res.data?.user;
  } catch {
    // Outside Next.js request scope or unconfigured Supabase
    user = null;
    supabase = null;
  }

  // If authenticated user exists, enforce that requestedPatientId (if any) matches auth.uid()
  if (user?.id) {
    if (requestedPatientId && requestedPatientId !== user.id) {
      return { error: { status: 403, message: "Forbidden: Cannot access another patient's data" } };
    }

    const patientId = user.id;

    // Fetch medications from Supabase
    const { data: dbMeds } = await supabase
      .from("medications")
      .select("*, documents(doc_date, doc_type, doctor, hospital)")
      .eq("patient_id", patientId)
      .eq("confirmed", true);

    const medications: MedicationRecord[] = (dbMeds || []).map((m: any) => ({
      ...m,
      doc_date: m.documents?.doc_date,
      doc_type: m.documents?.doc_type,
      doctor: m.documents?.doctor,
      hospital: m.documents?.hospital,
    }));

    // Fetch dose logs
    const { data: dbLogs } = await supabase
      .from("dose_logs")
      .select("*")
      .eq("patient_id", patientId);

    // Fetch overrides
    const { data: dbOverrides } = await supabase
      .from("medication_schedule_overrides")
      .select("*")
      .eq("patient_id", patientId);

    const scheduleOverrides: Record<string, string[]> = {};
    if (dbOverrides) {
      for (const ov of dbOverrides) {
        if (ov.times && Array.isArray(ov.times)) {
          scheduleOverrides[ov.medication_id] = ov.times;
        }
      }
    }

    // If user has database records, return them
    if (medications.length > 0 || (dbLogs && dbLogs.length > 0)) {
      return {
        context: {
          patientId,
          isDemo: false,
          medications,
          doseLogs: (dbLogs as DoseLogRecord[]) || [],
          scheduleOverrides,
        },
      };
    }
  }

  // Demo fallback
  const demoPatientId = "demo-patient-001";
  if (requestedPatientId && requestedPatientId !== demoPatientId) {
    return { error: { status: 403, message: "Forbidden: Cannot access another patient's data" } };
  }

  const demoData = DEMO_PATIENTS_DATA[demoPatientId];
  return {
    context: {
      patientId: demoPatientId,
      isDemo: true,
      medications: demoData?.medications || [],
      doseLogs: getDemoDoseLogs(demoPatientId),
      scheduleOverrides: getDemoOverrides(demoPatientId),
    },
  };
}

export async function persistDoseLog(
  context: PatientAdherenceContext,
  params: {
    medication_id: string;
    slot_key: string;
    scheduled_date: string;
    status: "taken" | "skipped";
  }
): Promise<{ action: "logged" | "undone"; record?: DoseLogRecord }> {
  const { patientId, isDemo } = context;

  if (isDemo) {
    const existing = DEMO_DOSE_LOGS.find(
      (l) =>
        l.patient_id === patientId &&
        l.medication_id === params.medication_id &&
        l.slot_key === params.slot_key &&
        l.scheduled_date === params.scheduled_date
    );

    // Reversibility: if exact same status exists, undo it!
    if (existing && existing.status === params.status) {
      deleteDemoDoseLog(patientId, params.medication_id, params.slot_key, params.scheduled_date);
      return { action: "undone" };
    }

    const saved = saveDemoDoseLog({
      patient_id: patientId,
      medication_id: params.medication_id,
      slot_key: params.slot_key,
      scheduled_date: params.scheduled_date,
      status: params.status,
    });
    return { action: "logged", record: saved };
  }

  // Supabase persistence
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("dose_logs")
    .select("*")
    .eq("patient_id", patientId)
    .eq("medication_id", params.medication_id)
    .eq("slot_key", params.slot_key)
    .eq("scheduled_date", params.scheduled_date)
    .maybeSingle();

  if (existing && existing.status === params.status) {
    await supabase.from("dose_logs").delete().eq("id", existing.id);
    return { action: "undone" };
  }

  if (existing) {
    const { data: updated } = await supabase
      .from("dose_logs")
      .update({ status: params.status, logged_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    return { action: "logged", record: updated };
  }

  const { data: inserted } = await supabase
    .from("dose_logs")
    .insert({
      patient_id: patientId,
      medication_id: params.medication_id,
      slot_key: params.slot_key,
      scheduled_date: params.scheduled_date,
      status: params.status,
      logged_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { action: "logged", record: inserted };
}

export async function persistScheduleOverride(
  context: PatientAdherenceContext,
  medicationId: string,
  times: string[]
): Promise<void> {
  const { patientId, isDemo } = context;

  if (isDemo) {
    saveDemoOverride(patientId, medicationId, times);
    return;
  }

  const supabase = await createClient();
  await supabase.from("medication_schedule_overrides").upsert(
    {
      patient_id: patientId,
      medication_id: medicationId,
      times,
    },
    { onConflict: "medication_id" }
  );
}
