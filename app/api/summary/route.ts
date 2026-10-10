import { attachDocuments } from "@/lib/documents/attach";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { buildSummary } from "@/lib/summary";
import type { MedicationRecord, DiagnosisRecord, AllergyRecord } from "@/lib/types/database";
import {
  errorResponse,
  requireSignedInPatient,
  resolvePatientAccess,
} from "@/lib/access/patient-access";

export const dynamic = "force-dynamic";

/** Clinical summary. Readable by the patient or a share code with "all" scope. */
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
      if (res.error) throw new Error(`Loading summary records failed: ${res.error.message}`);
    }

    const flatten = (rows: any[] | null) =>
      (rows ?? []).map((r: any) => ({
        ...r,
        doc_date: r.documents?.doc_date,
        doc_type: r.documents?.doc_type,
        doctor: r.documents?.doctor,
        hospital: r.documents?.hospital,
      }));

    const meds = flatten(medsRes.data) as MedicationRecord[];
    const diagnoses = flatten(diagsRes.data) as DiagnosisRecord[];
    const allergies = flatten(allergiesRes.data) as AllergyRecord[];
    const labs = (labsRes.data ?? []) as any[];

    const todayParam = request.nextUrl.searchParams.get("today");
    const summary = buildSummary(meds, diagnoses, allergies, {
      today: todayParam || undefined,
      includeSources: true,
    });

    return NextResponse.json({ summary, labs });
  } catch (error: any) {
    console.error("Error generating clinical summary:", error);
    return errorResponse(error, "Failed to generate clinical summary");
  }
}

/** Patient-reported allergy. Owner-only. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const patientId = auth.user.id;

    const body = await request.json();
    const { substance, reaction } = body;

    if (!substance || !String(substance).trim()) {
      return NextResponse.json({ error: "Substance name is required" }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const evidenceText = `Added by you on ${todayStr}`;
    const { data: allergy, error } = await createAdminClient()
      .from("allergies")
      .insert({
        patient_id: patientId,
        source_type: "patient",
        substance: String(substance).trim(),
        reaction: (reaction || "").trim() || "Adverse reaction reported",
        evidence_text: evidenceText,
        confidence: 1.0,
        confirmed: true,
      })
      .select("*")
      .single();
    if (error || !allergy) {
      throw new Error(`Saving allergy failed: ${error?.message ?? "unknown error"}`);
    }

    return NextResponse.json({ success: true, allergy });
  } catch (error: any) {
    return errorResponse(error, "Failed to record bad reaction");
  }
}

/** Marks a medication as stopped or active. Owner-only. */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const patientId = auth.user.id;

    const body = await request.json();
    const { medication_id, stopped } = body;

    if (!medication_id) {
      return NextResponse.json({ error: "Missing medication_id" }, { status: 400 });
    }

    const stoppedOn = stopped ? new Date().toISOString().split("T")[0] : null;

    const { data, error } = await createAdminClient()
      .from("medications")
      .update({
        patient_marked_stopped: Boolean(stopped),
        stopped_on: stoppedOn,
      })
      .eq("id", medication_id)
      .eq("patient_id", patientId)
      .select("id");
    if (error) throw new Error(`Updating medication failed: ${error.message}`);
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      medication_id,
      patient_marked_stopped: Boolean(stopped),
      stopped_on: stoppedOn,
    });
  } catch (error: any) {
    return errorResponse(error, "Failed to update medication status");
  }
}
