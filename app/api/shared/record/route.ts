import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { buildSummary } from "@/lib/summary";
import { attachDocuments } from "@/lib/documents/attach";
import { documentsStore } from "@/lib/documents/store";
import { withFileUrl } from "@/lib/documents/links";
import { getAppointments, getDiagnoses, getEncounters, getLabResults, getPatientProfile, getMedicalDocuments } from "@/lib/data/store";
import { errorResponse, resolvePatientAccess } from "@/lib/access/patient-access";
import type { AllergyRecord, DiagnosisRecord, MedicationRecord } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Full read-only record for a doctor who entered a share code (or for the patient).
 * Access is checked by resolvePatientAccess: the share must be valid, unrevoked and unexpired.
 */
export async function GET(request: NextRequest) {
  try {
    const access = await resolvePatientAccess(request, "all");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const patientId = access.patientId;
    const admin = createAdminClient();

    const [medsRes, diagsRes, allergiesRes, shareRes] = await Promise.all([
      admin.from("medications").select("*").eq("patient_id", patientId).eq("confirmed", true),
      admin.from("diagnoses").select("*").eq("patient_id", patientId).eq("confirmed", true),
      admin.from("allergies").select("*").eq("patient_id", patientId).eq("confirmed", true),
      access.actorType === "share_code"
        ? admin.from("shares").select("expires_at").eq("id", access.actorId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    for (const r of [medsRes, diagsRes, allergiesRes]) {
      if (r.error) throw new Error(`Loading record failed: ${r.error.message}`);
    }
    const meds = (medsRes.data ?? []) as MedicationRecord[];
    const diagnoses = (diagsRes.data ?? []) as DiagnosisRecord[];
    const allergies = (allergiesRes.data ?? []) as AllergyRecord[];
    await Promise.all([meds, diagnoses, allergies].map((rows) => attachDocuments(admin, rows as never)));

    const [profile, labs, encounters, appointments, diagnosisList, vault, uploads] = await Promise.all([
      getPatientProfile(patientId),
      getLabResults(patientId),
      getEncounters(patientId),
      getAppointments(patientId),
      getDiagnoses(patientId),
      getMedicalDocuments(patientId),
      documentsStore.getAll(patientId),
    ]);

    const summary = buildSummary(meds, diagnoses, allergies, { includeSources: true });
    const uploadsWithLinks = await Promise.all(uploads.map((d) => withFileUrl(d)));

    return NextResponse.json({
      access: {
        actor_type: access.actorType,
        expires_at: shareRes.data?.expires_at ?? null,
      },
      profile: {
        full_name: profile.full_name,
        dob: profile.dob ?? null,
        sex: profile.sex ?? null,
        blood_group: profile.blood_group ?? null,
        health_id: profile.health_id,
        phone: profile.phone ?? null,
      },
      summary,
      medications: meds,
      diagnoses: diagnosisList,
      allergies,
      labs,
      encounters,
      appointments,
      vault,
      documents: uploadsWithLinks,
    });
  } catch (err) {
    return errorResponse(err, "Could not load the patient record");
  }
}
