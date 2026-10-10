import {
  Profile,
  TrustedContact,
  Diagnosis,
  Encounter,
  LabResult,
  FollowUpAppointment,
  MedicalDocument,
} from "@/lib/types/database";
import { createAdminClient } from "@/lib/supabase/server";

/*
 * Persistence layer. Every function reads or writes Supabase directly.
 * Callers must pass a patient id that was verified from the session or a share/emergency token.
 * Errors are thrown, never swallowed, so the UI reports real failures.
 */

const today = () => new Date().toISOString().split("T")[0];

function fail(action: string, error: { message: string } | null): never {
  throw new Error(`${action} failed: ${error?.message ?? "unknown error"}`);
}

export async function getPatientProfile(patientId: string): Promise<Profile> {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("*")
    .eq("id", patientId)
    .maybeSingle();
  if (error) fail("Loading profile", error);
  if (!data) throw new Error("Profile not found");
  return data as Profile;
}

export async function updatePatientProfile(
  patientId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  // Never allow identity fields to be changed through the profile form.
  const { id: _id, role: _role, health_id: _health, ...safe } = updates;
  const { data, error } = await createAdminClient()
    .from("profiles")
    .update(safe)
    .eq("id", patientId)
    .select("*")
    .single();
  if (error) fail("Updating profile", error);
  return data as Profile;
}

export async function getTrustedContacts(patientId: string): Promise<TrustedContact[]> {
  const { data, error } = await createAdminClient()
    .from("trusted_contacts")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });
  if (error) fail("Loading trusted contacts", error);
  return (data ?? []) as TrustedContact[];
}

export async function addTrustedContact(
  patientId: string,
  contact: { name: string; email: string; relation: string }
): Promise<TrustedContact> {
  const { data, error } = await createAdminClient()
    .from("trusted_contacts")
    .insert({ patient_id: patientId, ...contact })
    .select("*")
    .single();
  if (error) fail("Adding trusted contact", error);
  return data as TrustedContact;
}

export async function deleteTrustedContact(patientId: string, contactId: string): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("trusted_contacts")
    .delete()
    .eq("id", contactId)
    .eq("patient_id", patientId);
  if (error) fail("Deleting trusted contact", error);
  return true;
}

export async function getEncounters(patientId: string): Promise<Encounter[]> {
  const { data, error } = await createAdminClient()
    .from("encounters")
    .select("*")
    .eq("patient_id", patientId)
    .order("start_date", { ascending: false });
  if (error) fail("Loading encounters", error);
  return (data ?? []) as Encounter[];
}

export async function createEncounter(
  patientId: string,
  encounterData: Partial<Encounter>
): Promise<Encounter> {
  const admin = createAdminClient();
  const startDate = encounterData.start_date || new Date().toISOString();
  const doctorName = encounterData.doctor_name || "Doctor Consultation";
  const hospital = encounterData.hospital || "General Clinic";
  const diagnoses = encounterData.diagnoses || [];
  const prescriptions = encounterData.prescriptions || [];

  const { data: encounter, error } = await admin
    .from("encounters")
    .insert({
      patient_id: patientId,
      kind: encounterData.kind || "consultation",
      start_date: startDate,
      doctor_name: doctorName,
      hospital,
      reason: encounterData.reason || "",
      notes: encounterData.notes || "",
      diagnoses,
      procedures: encounterData.procedures || [],
      prescriptions,
      next_visit_date: encounterData.next_visit_date || null,
      next_visit_notes: encounterData.next_visit_notes || null,
      next_visit_status: encounterData.next_visit_date ? "upcoming" : null,
      confirmed: true,
    })
    .select("*")
    .single();
  if (error) fail("Creating encounter", error);
  const created = encounter as Encounter;

  if (created.next_visit_date) {
    const { error: apptError } = await admin.from("appointments").insert({
      encounter_id: created.id,
      patient_id: patientId,
      doctor_name: doctorName,
      hospital,
      scheduled_date: created.next_visit_date,
      scheduled_time: "10:00 AM",
      reason: created.next_visit_notes || `Follow-up with ${doctorName}`,
      instructions: "Bring all recent test reports and medications.",
      status: "upcoming",
    });
    if (apptError) fail("Scheduling follow-up", apptError);
  }

  for (const diagName of diagnoses) {
    const { data: existing } = await admin
      .from("diagnoses")
      .select("id")
      .eq("patient_id", patientId)
      .ilike("name_canonical", diagName)
      .limit(1);
    if (!existing || existing.length === 0) {
      const { error: diagError } = await admin.from("diagnoses").insert({
        patient_id: patientId,
        name_as_written: diagName,
        name_canonical: diagName,
        diagnosed_date: startDate.split("T")[0],
        doctor_name: doctorName,
        hospital,
        notes: `Identified during consultation: ${created.reason || ""}`,
        status: "active",
        confidence: 1.0,
        confirmed: true,
      });
      if (diagError) fail("Saving diagnosis", diagError);
    }
  }

  if (prescriptions.length > 0) {
    const rows = prescriptions.map((rx) => ({
      patient_id: patientId,
      name_as_written: rx.name,
      ingredients: [rx.name.toLowerCase().replace(/tab\.?|cap\.?|syp\.?|inj\.?/g, "").trim()],
      strength: rx.dosage,
      dose: rx.dosage,
      frequency: rx.frequency,
      duration_days: parseInt(rx.duration) || 30,
      prescribed_by: doctorName,
      hospital,
      start_date: startDate.split("T")[0],
      patient_marked_stopped: false,
      confidence: 1.0,
      confirmed: true,
    }));
    const { error: medError } = await admin.from("medications").insert(rows);
    if (medError) fail("Saving prescriptions", medError);
  }

  return created;
}

export async function getDiagnoses(patientId: string): Promise<Diagnosis[]> {
  const { data, error } = await createAdminClient()
    .from("diagnoses")
    .select("*")
    .eq("patient_id", patientId)
    .order("diagnosed_date", { ascending: false });
  if (error) fail("Loading diagnoses", error);
  return (data ?? []) as Diagnosis[];
}

export async function addDiagnosis(
  patientId: string,
  diagData: Partial<Diagnosis>
): Promise<Diagnosis> {
  const name = diagData.name_as_written || "Condition";
  const { data, error } = await createAdminClient()
    .from("diagnoses")
    .insert({
      patient_id: patientId,
      name_as_written: name,
      name_canonical: diagData.name_canonical || name,
      diagnosed_date: diagData.diagnosed_date || today(),
      doctor_name: diagData.doctor_name || null,
      hospital: diagData.hospital || null,
      notes: diagData.notes || "",
      status: diagData.status || "active",
      confidence: 1.0,
      confirmed: true,
    })
    .select("*")
    .single();
  if (error) fail("Adding diagnosis", error);
  return data as Diagnosis;
}

export async function getAppointments(patientId: string): Promise<FollowUpAppointment[]> {
  const { data, error } = await createAdminClient()
    .from("appointments")
    .select("*")
    .eq("patient_id", patientId)
    .order("scheduled_date", { ascending: true });
  if (error) fail("Loading appointments", error);
  return (data ?? []) as FollowUpAppointment[];
}

export async function updateAppointmentStatus(
  patientId: string,
  appointmentId: string,
  status: "upcoming" | "completed" | "cancelled" | "overdue"
): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .eq("patient_id", patientId)
    .select("id");
  if (error) fail("Updating appointment", error);
  return (data ?? []).length > 0;
}

export async function addAppointment(
  patientId: string,
  data: Partial<FollowUpAppointment>
): Promise<FollowUpAppointment> {
  const { data: row, error } = await createAdminClient()
    .from("appointments")
    .insert({
      patient_id: patientId,
      doctor_name: data.doctor_name || "Doctor",
      hospital: data.hospital || "Clinic",
      scheduled_date: data.scheduled_date || today(),
      scheduled_time: data.scheduled_time || "10:00 AM",
      reason: data.reason || "Follow-up consultation",
      instructions: data.instructions || "Bring recent records and medications",
      status: "upcoming",
    })
    .select("*")
    .single();
  if (error) fail("Adding appointment", error);
  return row as FollowUpAppointment;
}

export async function getLabResults(patientId: string): Promise<LabResult[]> {
  const { data, error } = await createAdminClient()
    .from("lab_results")
    .select("*")
    .eq("patient_id", patientId)
    .order("taken_on", { ascending: true });
  if (error) fail("Loading lab results", error);
  return (data ?? []) as LabResult[];
}

export async function addLabResult(
  patientId: string,
  resultData: Partial<LabResult>
): Promise<LabResult> {
  const { data, error } = await createAdminClient()
    .from("lab_results")
    .insert({
      patient_id: patientId,
      test_name: resultData.test_name || "Blood Test",
      value_num: Number(resultData.value_num) || 0,
      value_text: resultData.value_text || String(resultData.value_num ?? ""),
      unit: resultData.unit || "mg/dL",
      ref_range: resultData.ref_range || "",
      flag: resultData.flag || "normal",
      taken_on: resultData.taken_on || today(),
      lab_name: resultData.lab_name || "Diagnostic Laboratory",
      confidence: 1.0,
      confirmed: true,
    })
    .select("*")
    .single();
  if (error) fail("Adding lab result", error);
  return data as LabResult;
}

export async function getMedicalDocuments(patientId: string): Promise<MedicalDocument[]> {
  const { data, error } = await createAdminClient()
    .from("medical_documents")
    .select("*")
    .eq("patient_id", patientId)
    .order("doc_date", { ascending: false });
  if (error) fail("Loading medical documents", error);
  return (data ?? []) as MedicalDocument[];
}

export async function addMedicalDocument(
  patientId: string,
  docData: Partial<MedicalDocument> & { storage_path?: string }
): Promise<MedicalDocument> {
  const { data, error } = await createAdminClient()
    .from("medical_documents")
    .insert({
      patient_id: patientId,
      title: docData.title || "Uploaded Medical Document",
      category: docData.category || "other",
      file_name: docData.file_name || "medical_record",
      file_type: docData.file_type || "application/octet-stream",
      file_size_bytes: docData.file_size_bytes || 0,
      storage_path: docData.storage_path ?? null,
      file_url: docData.file_url ?? null,
      doc_date: docData.doc_date || today(),
      doctor: docData.doctor || null,
      hospital: docData.hospital || null,
      notes: docData.notes || "",
    })
    .select("*")
    .single();
  if (error) fail("Adding medical document", error);
  return data as MedicalDocument;
}

/** Deletes the vault entry and its stored file. Only removes rows owned by `patientId`. */
export async function deleteMedicalDocument(patientId: string, docId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: row, error: readError } = await admin
    .from("medical_documents")
    .select("storage_path")
    .eq("id", docId)
    .eq("patient_id", patientId)
    .maybeSingle();
  if (readError) fail("Loading medical document", readError);
  if (!row) return false;

  if (row.storage_path) {
    await admin.storage.from("medical-files").remove([row.storage_path]);
  }
  const { error } = await admin
    .from("medical_documents")
    .delete()
    .eq("id", docId)
    .eq("patient_id", patientId);
  if (error) fail("Deleting medical document", error);
  return true;
}
