import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_PATIENTS_DATA } from "@/seed/patients";

export const dynamic = "force-dynamic";

export interface TimelineEvent {
  id: string;
  type: "medication" | "lab_result" | "encounter" | "diagnosis";
  title: string;
  date: string | null;
  display_date: string;
  doctor?: string | null;
  hospital?: string | null;
  badge: string;
  badge_color: "emerald" | "amber" | "rose" | "blue" | "purple";
  details: Array<{ label: string; value: string }>;
  evidence_text: string;
  document_id?: string | null;
  page_number?: number | null;
  is_active?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const requestedPatientId = request.nextUrl.searchParams.get("patient_id");
    const patientId = user?.id || requestedPatientId || "demo-patient-001";
    let events: TimelineEvent[] = [];

    // Check DB first
    let hasDbData = false;
    if (user?.id) {
      const [medsRes, diagsRes, labsRes, encsRes] = await Promise.all([
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
          .from("lab_results")
          .select("*, documents(doc_date, doc_type, doctor, hospital)")
          .eq("patient_id", patientId)
          .eq("confirmed", true),
        supabase
          .from("encounters")
          .select("*, documents(doc_date, doc_type, doctor, hospital)")
          .eq("patient_id", patientId)
          .eq("confirmed", true),
      ]);

      const meds = medsRes.data || [];
      const diags = diagsRes.data || [];
      const labs = labsRes.data || [];
      const encs = encsRes.data || [];

      if (meds.length > 0 || diags.length > 0 || labs.length > 0 || encs.length > 0) {
        hasDbData = true;

        for (const m of meds) {
          const d = m.documents?.doc_date || m.created_at;
          events.push({
            id: `med-${m.id}`,
            type: "medication",
            title: `Prescription: ${m.name_as_written}`,
            date: d || null,
            display_date: d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Undated",
            doctor: m.documents?.doctor || null,
            hospital: m.documents?.hospital || null,
            badge: m.patient_marked_stopped ? "Stopped" : "Medication",
            badge_color: m.patient_marked_stopped ? "rose" : "blue",
            details: [
              { label: "Strength", value: m.strength || "Standard" },
              { label: "Dose / Frequency", value: [m.dose, m.frequency].filter(Boolean).join(" ") || "As directed" },
              { label: "Ingredients", value: (m.ingredients || []).join(", ") || m.name_as_written },
            ],
            evidence_text: m.evidence_text || "",
            document_id: m.document_id,
            page_number: m.page_number,
            is_active: !m.patient_marked_stopped,
          });
        }

        for (const d of diags) {
          const dateStr = d.documents?.doc_date || d.created_at;
          events.push({
            id: `diag-${d.id}`,
            type: "diagnosis",
            title: `Diagnosis: ${d.name_canonical || d.name_as_written}`,
            date: dateStr || null,
            display_date: dateStr ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Undated",
            doctor: d.documents?.doctor || null,
            hospital: d.documents?.hospital || null,
            badge: "Condition",
            badge_color: "purple",
            details: [
              { label: "Recorded As", value: d.name_as_written },
              { label: "Canonical Name", value: d.name_canonical },
            ],
            evidence_text: d.evidence_text || "",
            document_id: d.document_id,
            page_number: d.page_number,
          });
        }

        for (const l of labs) {
          const dateStr = l.taken_on || l.documents?.doc_date || l.created_at;
          events.push({
            id: `lab-${l.id}`,
            type: "lab_result",
            title: `Lab Test: ${l.test_name}`,
            date: dateStr || null,
            display_date: dateStr ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Undated",
            doctor: l.documents?.doctor || null,
            hospital: l.lab_name || l.documents?.hospital || null,
            badge: l.flag || "Lab Result",
            badge_color: l.flag === "HIGH" || l.flag === "ABNORMAL" ? "amber" : "emerald",
            details: [
              { label: "Result", value: l.value_num !== null && l.value_num !== undefined ? `${l.value_num} ${l.unit || ""}` : l.value_text || "Recorded" },
              { label: "Reference Range", value: l.ref_range || "N/A" },
            ],
            evidence_text: l.evidence_text || "",
            document_id: l.document_id,
            page_number: l.page_number,
          });
        }

        for (const e of encs) {
          const dateStr = e.start_date || e.documents?.doc_date || e.created_at;
          events.push({
            id: `enc-${e.id}`,
            type: "encounter",
            title: `Clinical Encounter: ${e.kind === "admission" ? "Hospital Admission" : "Outpatient Visit"}`,
            date: dateStr || null,
            display_date: dateStr ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Undated",
            doctor: e.documents?.doctor || null,
            hospital: e.documents?.hospital || null,
            badge: e.kind.toUpperCase(),
            badge_color: "emerald",
            details: [
              { label: "Reason", value: e.reason || "General Consultation" },
              { label: "Procedures", value: (e.procedures || []).join(", ") || "Clinical evaluation" },
            ],
            evidence_text: `Encounter record: ${e.reason || "Clinical evaluation"}`,
            document_id: e.document_id,
          });
        }
      }
    }

    // Fallback to simulated demo patient ONLY if patientId is demo-patient-001
    if (!hasDbData && patientId === "demo-patient-001") {
      const demo = DEMO_PATIENTS_DATA["demo-patient-001"];

      // Add medications
      for (const m of demo.medications) {
        const d = m.doc_date;
        events.push({
          id: `med-${m.id}`,
          type: "medication",
          title: `Prescription: ${m.name_as_written}`,
          date: d || null,
          display_date: d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Undated",
          doctor: m.doctor,
          hospital: m.hospital,
          badge: m.patient_marked_stopped ? "Stopped" : "Medication",
          badge_color: m.patient_marked_stopped ? "rose" : "blue",
          details: [
            { label: "Strength", value: m.strength || "Standard" },
            { label: "Dose / Frequency", value: [m.dose, m.frequency].filter(Boolean).join(" ") || "As directed" },
            { label: "Ingredients", value: (m.ingredients || []).join(", ") },
          ],
          evidence_text: m.evidence_text,
          document_id: m.document_id,
          page_number: m.page_number,
          is_active: !m.patient_marked_stopped,
        });
      }

      // Add diagnoses
      for (const diag of demo.diagnoses) {
        const d = diag.doc_date;
        events.push({
          id: `diag-${diag.id}`,
          type: "diagnosis",
          title: `Diagnosis: ${diag.name_canonical}`,
          date: d || null,
          display_date: d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Undated",
          doctor: diag.doctor,
          hospital: diag.hospital,
          badge: "Condition",
          badge_color: "purple",
          details: [
            { label: "Recorded As", value: diag.name_as_written },
            { label: "Canonical Name", value: diag.name_canonical },
          ],
          evidence_text: diag.evidence_text,
          document_id: diag.document_id,
          page_number: diag.page_number,
        });
      }

      // Add lab results
      for (const lab of demo.lab_results) {
        const d = lab.taken_on || lab.doc_date;
        events.push({
          id: `lab-${lab.id}`,
          type: "lab_result",
          title: `Lab Test: ${lab.test_name}`,
          date: d || null,
          display_date: d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Undated",
          doctor: null,
          hospital: lab.lab_name,
          badge: lab.flag || "Lab Result",
          badge_color: lab.flag === "HIGH" ? "amber" : "emerald",
          details: [
            { label: "Result", value: `${lab.value_num ?? ""} ${lab.unit ?? ""}`.trim() },
            { label: "Reference Range", value: lab.ref_range || "N/A" },
          ],
          evidence_text: lab.evidence_text,
          document_id: lab.document_id,
          page_number: lab.page_number,
        });
      }

      // Add encounters
      for (const enc of demo.encounters) {
        const d = enc.start_date;
        events.push({
          id: `enc-${enc.id}`,
          type: "encounter",
          title: `Clinical Encounter: ${enc.hospital}`,
          date: d || null,
          display_date: d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Undated",
          doctor: enc.doctor,
          hospital: enc.hospital,
          badge: enc.kind.toUpperCase(),
          badge_color: "emerald",
          details: [
            { label: "Reason", value: enc.reason || "Consultation" },
            { label: "Procedures", value: (enc.procedures || []).join(", ") },
          ],
          evidence_text: `Encounter record: ${enc.reason}`,
          document_id: enc.document_id,
        });
      }
    }

    // Sort all events newest first (null dates last)
    events.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return NextResponse.json({
      events,
      total: events.length,
    });
  } catch (error: any) {
    console.error("Error fetching timeline events:", error);
    return NextResponse.json({ error: error.message || "Failed to load timeline" }, { status: 500 });
  }
}
