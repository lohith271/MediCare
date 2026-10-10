import { createAdminClient } from "@/lib/supabase/server";
import type { MedicalDataExtract } from "@/lib/llm/adapter";

export interface CommitCounts {
  medications: number;
  lab_results: number;
  diagnoses: number;
  allergies: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns a YYYY-MM-DD string, or null when the value is not a plain ISO date. */
function isoDateOrNull(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 10);
  return ISO_DATE.test(trimmed) ? trimmed : null;
}

/** "BID", "2 days", "30 days", "ongoing" -> a whole number of days, or null. */
function durationDays(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function numberOrZero(value: string): number {
  const n = parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function labFlag(flag: string | undefined): "normal" | "high" | "low" | "critical" {
  if (flag === "high" || flag === "low" || flag === "critical") return flag;
  if (flag === "abnormal") return "high";
  return "normal";
}

/**
 * Writes the reviewed extraction into the clinical tables so it appears in the
 * timeline, summary, safety checks and today's doses.
 *
 * Idempotent: rows created from this document are replaced on every confirm, so
 * confirming twice never duplicates medicines or results.
 */
export async function commitExtraction(
  patientId: string,
  documentId: string,
  data: MedicalDataExtract
): Promise<CommitCounts> {
  const admin = createAdminClient();
  const docDate = isoDateOrNull((data as { document_date?: string }).document_date) ?? null;
  const dischargeDate = isoDateOrNull((data as { discharge_date?: string }).discharge_date);
  const eventDate = dischargeDate ?? docDate;
  // Doses start today, so a newly uploaded prescription shows up in today's doses.
  const today = new Date().toISOString().split("T")[0];

  const doctor =
    (data as { doctor_name?: string }).doctor_name ?? null;
  const facility =
    (data as { clinic_name?: string }).clinic_name ??
    (data as { hospital_name?: string }).hospital_name ??
    (data as { lab_name?: string }).lab_name ??
    null;

  // Remove rows from an earlier confirm of this document.
  for (const table of ["medications", "lab_results", "diagnoses", "allergies"] as const) {
    const { error } = await admin
      .from(table)
      .delete()
      .eq("patient_id", patientId)
      .eq("document_id", documentId);
    if (error) throw new Error(`Clearing previous ${table} failed: ${error.message}`);
  }

  const medications = "medications" in data && Array.isArray(data.medications) ? data.medications : [];
  const labs = "lab_results" in data && Array.isArray(data.lab_results) ? data.lab_results : [];
  const diagnoses = "diagnoses" in data && Array.isArray(data.diagnoses) ? data.diagnoses : [];
  const allergies = "allergies" in data && Array.isArray(data.allergies) ? data.allergies : [];

  if (medications.length) {
    const rows = medications.map((m) => ({
      patient_id: patientId,
      document_id: documentId,
      evidence_text: m.evidence_text,
      name_as_written: m.name,
      ingredients: [(m.generic_name || m.name).toLowerCase()],
      strength: m.dosage ?? null,
      dose: m.dosage ?? null,
      frequency: m.frequency ?? null,
      duration_days: durationDays(m.duration),
      prescribed_by: doctor,
      hospital: facility,
      start_date: today,
      patient_marked_stopped: false,
      confidence: m.confidence,
      confirmed: true,
    }));
    const { error } = await admin.from("medications").insert(rows);
    if (error) throw new Error(`Saving medicines failed: ${error.message}`);
  }

  if (labs.length) {
    const rows = labs.map((l) => ({
      patient_id: patientId,
      document_id: documentId,
      evidence_text: l.evidence_text,
      test_name: l.test_name,
      value_num: numberOrZero(l.value),
      value_text: l.value,
      unit: l.unit || "",
      ref_range: l.reference_range ?? null,
      flag: labFlag(l.flag),
      taken_on: eventDate ?? today,
      lab_name: (data as { lab_name?: string }).lab_name ?? null,
      confidence: l.confidence,
      confirmed: true,
    }));
    const { error } = await admin.from("lab_results").insert(rows);
    if (error) throw new Error(`Saving lab results failed: ${error.message}`);
  }

  if (diagnoses.length) {
    const rows = diagnoses.map((d) => ({
      patient_id: patientId,
      document_id: documentId,
      evidence_text: d.evidence_text,
      name_as_written: d.condition,
      name_canonical: d.condition,
      diagnosed_date: eventDate ?? today,
      doctor_name: doctor,
      hospital: facility,
      status: "active",
      confidence: d.confidence,
      confirmed: true,
    }));
    const { error } = await admin.from("diagnoses").insert(rows);
    if (error) throw new Error(`Saving diagnoses failed: ${error.message}`);
  }

  if (allergies.length) {
    const rows = allergies.map((a) => ({
      patient_id: patientId,
      source_type: "document",
      document_id: documentId,
      evidence_text: a.evidence_text,
      substance: a.allergen,
      reaction: a.reaction ?? null,
      created_on: eventDate ?? today,
      confidence: a.confidence,
      confirmed: true,
    }));
    const { error } = await admin.from("allergies").insert(rows);
    if (error) throw new Error(`Saving allergies failed: ${error.message}`);
  }

  return {
    medications: medications.length,
    lab_results: labs.length,
    diagnoses: diagnoses.length,
    allergies: allergies.length,
  };
}
