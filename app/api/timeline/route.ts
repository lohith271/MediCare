import { attachDocuments } from "@/lib/documents/attach";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { errorResponse, resolvePatientAccess } from "@/lib/access/patient-access";

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

const displayDate = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Undated";

/** Chronological clinical timeline. Readable by the patient or an "all" share code. */
export async function GET(request: NextRequest) {
  try {
    const access = await resolvePatientAccess(request, "all");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const patientId = access.patientId;

    const admin = createAdminClient();
    const [medsRes, diagsRes, labsRes, encsRes] = await Promise.all([
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
        .from("lab_results")
        .select("*")
        .eq("patient_id", patientId)
        .eq("confirmed", true),
      admin
        .from("encounters")
        .select("*")
        .eq("patient_id", patientId)
        .eq("confirmed", true),
    ]);
    await Promise.all([medsRes, diagsRes, labsRes, encsRes].map((r) => attachDocuments(admin, r.data)));
    for (const res of [medsRes, diagsRes, labsRes, encsRes]) {
      if (res.error) throw new Error(`Loading timeline records failed: ${res.error.message}`);
    }

    const meds = medsRes.data || [];
    const diags = diagsRes.data || [];
    const labs = labsRes.data || [];
    const encs = encsRes.data || [];

    const events: TimelineEvent[] = [];

    for (const m of meds) {
      const d = m.documents?.doc_date || m.created_at;
      events.push({
        id: `med-${m.id}`,
        type: "medication",
        title: `Prescription: ${m.name_as_written}`,
        date: d || null,
        display_date: displayDate(d),
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
        display_date: displayDate(dateStr),
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
        display_date: displayDate(dateStr),
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
        display_date: displayDate(dateStr),
        doctor: e.documents?.doctor || null,
        hospital: e.documents?.hospital || null,
        badge: String(e.kind || "consultation").toUpperCase(),
        badge_color: "emerald",
        details: [
          { label: "Reason", value: e.reason || "General Consultation" },
          { label: "Procedures", value: (e.procedures || []).join(", ") || "Clinical evaluation" },
        ],
        evidence_text: `Encounter record: ${e.reason || "Clinical evaluation"}`,
        document_id: e.document_id,
      });
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
    return errorResponse(error, "Failed to load timeline");
  }
}
