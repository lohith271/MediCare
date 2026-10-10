import { attachDocuments } from "@/lib/documents/attach";
import { createClient } from "@/lib/supabase/server";
import { requireSignedInPatient } from "@/lib/access/patient-access";
import type { MedicationRecord } from "@/lib/types/database";

// Adherence is patient-owned: every query runs as the signed-in patient, so RLS
// (dose_logs, medication_schedule_overrides, medications) also applies.
export interface DoseLogRecord {
  id?: string;
  patient_id: string;
  medication_id: string;
  slot_key: string;
  scheduled_date: string;
  status: "taken" | "skipped";
  logged_at?: string;
}

export interface PatientAdherenceContext {
  patientId: string;
  /** Kept for response compatibility. Always false now that demo data is gone. */
  isDemo: boolean;
  medications: MedicationRecord[];
  doseLogs: DoseLogRecord[];
  scheduleOverrides: Record<string, string[]>;
}

export async function resolvePatientContext(): Promise<{
  error?: { status: number; message: string };
  context?: PatientAdherenceContext;
}> {
  const auth = await requireSignedInPatient();
  if (!auth.ok) return { error: { status: auth.status, message: auth.error } };

  const patientId = auth.user.id;
  const supabase = await createClient();

  const { data: dbMeds, error: medsError } = await supabase
    .from("medications")
    .select("*")
    .eq("patient_id", patientId)
    .eq("confirmed", true);
  if (medsError) throw new Error(`Loading medications failed: ${medsError.message}`);
  await attachDocuments(supabase, dbMeds);

  const medications: MedicationRecord[] = (dbMeds || []).map((m: any) => ({
    ...m,
    doc_date: m.documents?.doc_date,
    doc_type: m.documents?.doc_type,
    doctor: m.documents?.doctor,
    hospital: m.documents?.hospital,
  }));

  const { data: dbLogs, error: logsError } = await supabase
    .from("dose_logs")
    .select("*")
    .eq("patient_id", patientId);
  if (logsError) throw new Error(`Loading dose logs failed: ${logsError.message}`);

  const { data: dbOverrides, error: overridesError } = await supabase
    .from("medication_schedule_overrides")
    .select("*")
    .eq("patient_id", patientId);
  if (overridesError) throw new Error(`Loading schedule overrides failed: ${overridesError.message}`);

  const scheduleOverrides: Record<string, string[]> = {};
  for (const ov of dbOverrides || []) {
    if (ov.times && Array.isArray(ov.times)) {
      scheduleOverrides[ov.medication_id] = ov.times;
    }
  }

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

export async function persistDoseLog(
  context: PatientAdherenceContext,
  params: {
    medication_id: string;
    slot_key: string;
    scheduled_date: string;
    status: "taken" | "skipped";
  }
): Promise<{ action: "logged" | "undone"; record?: DoseLogRecord }> {
  const { patientId } = context;
  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from("dose_logs")
    .select("*")
    .eq("patient_id", patientId)
    .eq("medication_id", params.medication_id)
    .eq("slot_key", params.slot_key)
    .eq("scheduled_date", params.scheduled_date)
    .maybeSingle();
  if (readError) throw new Error(`Loading dose log failed: ${readError.message}`);

  // Reversibility: logging the same status again removes the entry.
  if (existing && existing.status === params.status) {
    const { error } = await supabase.from("dose_logs").delete().eq("id", existing.id);
    if (error) throw new Error(`Undoing dose log failed: ${error.message}`);
    return { action: "undone" };
  }

  if (existing) {
    const { data: updated, error } = await supabase
      .from("dose_logs")
      .update({ status: params.status, logged_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(`Updating dose log failed: ${error.message}`);
    return { action: "logged", record: updated as DoseLogRecord };
  }

  const { data: inserted, error } = await supabase
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
  if (error) throw new Error(`Saving dose log failed: ${error.message}`);
  return { action: "logged", record: inserted as DoseLogRecord };
}

export async function persistScheduleOverride(
  context: PatientAdherenceContext,
  medicationId: string,
  times: string[]
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("medication_schedule_overrides").upsert(
    {
      patient_id: context.patientId,
      medication_id: medicationId,
      times,
    },
    { onConflict: "medication_id" }
  );
  if (error) throw new Error(`Saving schedule override failed: ${error.message}`);
}
