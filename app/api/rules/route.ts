import { attachDocuments } from "@/lib/documents/attach";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { evaluateSafetyRules } from "@/lib/rules";
import { errorResponse, resolvePatientAccess } from "@/lib/access/patient-access";
import type {
  MedicationRecord,
  DiagnosisRecord,
  AllergyRecord,
  LabResultRecord,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";

/** Safety rule flags for the patient, or for a patient who granted an "all" share code. */
export async function GET(request: NextRequest) {
  try {
    const access = await resolvePatientAccess(request, "all");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const patientId = access.patientId;

    const admin = createAdminClient();
    const [medsRes, diagsRes, allergiesRes, labsRes] = await Promise.all([
      admin
        .from("medications")
        .select("*")
        .eq("patient_id", patientId)
        .eq("confirmed", true),
      admin
        .from("diagnoses")
        .select("*")
        .eq("patient_id", patientId)
        .eq("confirmed", true),
      admin
        .from("allergies")
        .select("*")
        .eq("patient_id", patientId)
        .eq("confirmed", true),
      admin
        .from("lab_results")
        .select("*")
        .eq("patient_id", patientId)
        .eq("confirmed", true),
    ]);
    await Promise.all([medsRes, diagsRes, allergiesRes, labsRes].map((r) => attachDocuments(admin, r.data)));
    for (const res of [medsRes, diagsRes, allergiesRes, labsRes]) {
      if (res.error) throw new Error(`Loading records for safety rules failed: ${res.error.message}`);
    }

    const flatten = <T>(rows: any[] | null): T[] =>
      (rows ?? []).map((r: any) => ({
        ...r,
        doc_date: r.documents?.doc_date,
        doc_type: r.documents?.doc_type,
        doctor: r.documents?.doctor,
        hospital: r.documents?.hospital,
      }));

    const meds = flatten<MedicationRecord>(medsRes.data);
    const diagnoses = flatten<DiagnosisRecord>(diagsRes.data);
    const allergies = flatten<AllergyRecord>(allergiesRes.data);
    const labs = flatten<LabResultRecord>(labsRes.data);

    const todayParam = request.nextUrl.searchParams.get("today");
    const result = evaluateSafetyRules(meds, diagnoses, allergies, labs, {
      today: todayParam || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error evaluating safety rules:", error);
    return errorResponse(error, "Failed to evaluate safety rules");
  }
}
