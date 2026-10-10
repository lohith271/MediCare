import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateSafetyRules } from "@/lib/rules";
import { DEMO_PATIENTS_DATA } from "@/seed/patients";
import type {
  MedicationRecord,
  DiagnosisRecord,
  AllergyRecord,
  LabResultRecord,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const requestedPatientId = request.nextUrl.searchParams.get("patient_id");
    const patientId = user?.id || requestedPatientId || "demo-patient-001";
    let meds: MedicationRecord[] = [];
    let diagnoses: DiagnosisRecord[] = [];
    let allergies: AllergyRecord[] = [];
    let labs: LabResultRecord[] = [];

    if (user?.id) {
      const [medsRes, diagsRes, allergiesRes, labsRes] = await Promise.all([
        supabase
          .from("medications")
          .select("*, documents(doc_date, doc_type, doctor, hospital)")
          .eq("patient_id", patientId)
          .eq("confirmed", true),
        supabase
          .from("diagnoses")
          .select("*, documents(doc_date, doc_type, doctor, hospital)")
          .eq("patient_id", patientId)
          .eq("confirmed", true),
        supabase
          .from("allergies")
          .select("*, documents(doc_date, doc_type, doctor, hospital)")
          .eq("patient_id", patientId)
          .eq("confirmed", true),
        supabase
          .from("lab_results")
          .select("*, documents(doc_date, doc_type, doctor, hospital)")
          .eq("patient_id", patientId)
          .eq("confirmed", true),
      ]);

      if (medsRes.data && medsRes.data.length > 0) {
        meds = medsRes.data.map((m: any) => ({
          ...m,
          doc_date: m.documents?.doc_date,
          doc_type: m.documents?.doc_type,
          doctor: m.documents?.doctor,
          hospital: m.documents?.hospital,
        }));
      }

      if (diagsRes.data && diagsRes.data.length > 0) {
        diagnoses = diagsRes.data.map((d: any) => ({
          ...d,
          doc_date: d.documents?.doc_date,
          doc_type: d.documents?.doc_type,
          doctor: d.documents?.doctor,
          hospital: d.documents?.hospital,
        }));
      }

      if (allergiesRes.data && allergiesRes.data.length > 0) {
        allergies = allergiesRes.data.map((a: any) => ({
          ...a,
          doc_date: a.documents?.doc_date,
          doc_type: a.documents?.doc_type,
          doctor: a.documents?.doctor,
          hospital: a.documents?.hospital,
        }));
      }

      if (labsRes.data && labsRes.data.length > 0) {
        labs = labsRes.data.map((l: any) => ({
          ...l,
          doc_date: l.documents?.doc_date,
          doc_type: l.documents?.doc_type,
          doctor: l.documents?.doctor,
          hospital: l.documents?.hospital,
        }));
      }
    }

    if (meds.length === 0 && labs.length === 0 && patientId === "demo-patient-001") {
      const demoData = DEMO_PATIENTS_DATA["demo-patient-001"];
      if (demoData) {
        meds = demoData.medications;
        diagnoses = demoData.diagnoses;
        allergies = demoData.allergies;
        labs = demoData.lab_results;
      }
    }

    const todayParam = request.nextUrl.searchParams.get("today");
    const result = evaluateSafetyRules(meds, diagnoses, allergies, labs, {
      today: todayParam || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error evaluating safety rules:", error);
    return NextResponse.json({
      flags: [],
      checked_at: new Date().toISOString(),
      counts: { high: 0, moderate: 0, warning: 0 },
    });
  }
}
