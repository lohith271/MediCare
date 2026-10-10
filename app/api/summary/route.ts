import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSummary } from "@/lib/summary";
import { DEMO_PATIENTS_DATA } from "@/seed/patients";
import type { MedicationRecord, DiagnosisRecord, AllergyRecord } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const patientId = user?.id || "demo-patient-001";
    let meds: MedicationRecord[] = [];
    let diagnoses: DiagnosisRecord[] = [];
    let allergies: AllergyRecord[] = [];

    // Attempt to fetch from Supabase if configured
    if (user?.id) {
      const [medsRes, diagsRes, allergiesRes] = await Promise.all([
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
    }

    // Fallback to simulated demo patient if no data in database
    if (meds.length === 0 && diagnoses.length === 0 && allergies.length === 0) {
      const demoData = DEMO_PATIENTS_DATA[patientId] || DEMO_PATIENTS_DATA["demo-patient-001"];
      if (demoData) {
        meds = demoData.medications;
        diagnoses = demoData.diagnoses;
        allergies = demoData.allergies;
      }
    }

    const todayParam = request.nextUrl.searchParams.get("today");
    const summary = buildSummary(meds, diagnoses, allergies, {
      today: todayParam || undefined,
      includeSources: true,
    });

    let labs: any[] = [];
    if (user?.id) {
      const labsRes = await supabase
        .from("lab_results")
        .select("*, documents(doc_date, doc_type, doctor, hospital)")
        .eq("patient_id", patientId)
        .eq("confirmed", true);
      if (labsRes.data && labsRes.data.length > 0) {
        labs = labsRes.data;
      }
    }
    if (labs.length === 0) {
      const demoData = DEMO_PATIENTS_DATA[patientId] || DEMO_PATIENTS_DATA["demo-patient-001"];
      labs = demoData?.lab_results || [];
    }

    return NextResponse.json({ summary, labs });
  } catch (error: any) {
    console.error("Error generating clinical summary:", error);
    // Graceful demo fallback on error
    const demoData = DEMO_PATIENTS_DATA["demo-patient-001"];
    const summary = buildSummary(demoData.medications, demoData.diagnoses, demoData.allergies);
    return NextResponse.json({ summary, labs: demoData.lab_results });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { substance, reaction } = body;

    if (!substance || !substance.trim()) {
      return NextResponse.json({ error: "Substance name is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const todayStr = new Date().toISOString().split("T")[0];
    const newAllergy: AllergyRecord = {
      id: `all-patient-${Date.now()}`,
      patient_id: user?.id || "demo-patient-001",
      source_type: "patient",
      document_id: null,
      page_number: null,
      evidence_text: `Added by you on ${todayStr}`,
      substance: substance.trim(),
      reaction: (reaction || "").trim() || "Adverse reaction reported",
      created_on: todayStr,
      confidence: 1.0,
      confirmed: true,
    };

    if (user?.id) {
      await supabase.from("allergies").insert([
        {
          patient_id: user.id,
          source_type: "patient",
          substance: newAllergy.substance,
          reaction: newAllergy.reaction,
          evidence_text: newAllergy.evidence_text,
          confidence: 1.0,
          confirmed: true,
        },
      ]);
    } else {
      // In-memory demo store
      const demoPatient = DEMO_PATIENTS_DATA["demo-patient-001"];
      demoPatient.allergies.unshift(newAllergy);
    }

    return NextResponse.json({ success: true, allergy: newAllergy });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to record bad reaction" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { medication_id, stopped } = body;

    if (!medication_id) {
      return NextResponse.json({ error: "Missing medication_id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const stoppedOn = stopped ? new Date().toISOString().split("T")[0] : null;

    if (user?.id) {
      await supabase
        .from("medications")
        .update({
          patient_marked_stopped: stopped,
          stopped_on: stoppedOn,
        })
        .eq("id", medication_id)
        .eq("patient_id", user.id);
    } else {
      // In-memory update for demo session
      const demoPatient = DEMO_PATIENTS_DATA["demo-patient-001"];
      const targetMed = demoPatient.medications.find((m) => m.id === medication_id);
      if (targetMed) {
        targetMed.patient_marked_stopped = stopped;
        targetMed.stopped_on = stoppedOn;
      }
    }

    return NextResponse.json({
      success: true,
      medication_id,
      patient_marked_stopped: stopped,
      stopped_on: stoppedOn,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update medication status" }, { status: 500 });
  }
}
