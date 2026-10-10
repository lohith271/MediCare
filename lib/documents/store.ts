/**
 * MediCare Document Store
 * Manages document persistence with Supabase Storage/DB integration
 * and reliable server-side fallback storage for hackathon demonstrations.
 */

import { MedicalDataExtract } from "@/lib/llm/adapter";

export type DocumentStatus = "uploaded" | "extracting" | "needs_review" | "confirmed" | "failed";

export interface StoredDocument {
  id: string;
  patient_id: string;
  file_name: string;
  file_type: "pdf" | "jpg" | "png";
  mime_type: string;
  size_bytes: number;
  page_count: number;
  doc_type?: string;
  doc_date?: string;
  doctor?: string;
  hospital?: string;
  status: DocumentStatus;
  confidence_score: number;
  draft_json: MedicalDataExtract | null;
  storage_path: string;
  file_data_url?: string;
  created_at: string;
  updated_at: string;
}

// In-memory persistent map across requests in the Node process
const globalDocStore = globalThis as unknown as {
  __medicare_documents?: Map<string, StoredDocument>;
};

if (!globalDocStore.__medicare_documents) {
  globalDocStore.__medicare_documents = new Map<string, StoredDocument>();

  // Pre-seed demo documents for the Hackathon review dashboard
  const sample1: StoredDocument = {
    id: "doc-demo-rx-01",
    patient_id: "patient-demo-001",
    file_name: "Metformin_Atorvastatin_Prescription.pdf",
    file_type: "pdf",
    mime_type: "application/pdf",
    size_bytes: 245800,
    page_count: 1,
    doc_type: "prescription",
    doc_date: "2026-10-08",
    doctor: "Dr. Rachel Adams, MD",
    hospital: "Metro Health Cardiology",
    status: "needs_review",
    confidence_score: 84,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    storage_path: "documents/patient-demo-001/doc-demo-rx-01.pdf",
    draft_json: {
      document_type: "prescription",
      confidence_score: 84,
      doctor_name: "Dr. Rachel Adams, MD (Cardiology)",
      clinic_name: "Metro Health Cardiology",
      document_date: "2026-10-08",
      medications: [
        {
          name: "Glucophage",
          generic_name: "metformin",
          dosage: "500 mg",
          frequency: "Twice a day",
          route: "oral",
          duration: "30 days",
          instructions: "Take with morning and evening meals",
          evidence_text: "Tab. Glucophage 500mg p.o. BID c. cib.",
          confidence: 0.95,
        },
        {
          name: "Lipitor",
          generic_name: "atorvastatin",
          dosage: "20 mg",
          frequency: "At bedtime",
          route: "oral",
          duration: "90 days",
          instructions: "Take at bedtime",
          evidence_text: "Lipitor 20mg 1 tab qhs #90",
          confidence: 0.92,
        },
        {
          name: "Lasix",
          generic_name: "furosemide",
          dosage: "40 mg",
          frequency: "Every morning",
          route: "oral",
          duration: "14 days",
          instructions: "Monitor BP and electrolytes",
          evidence_text: "Lasix 40mg q.a.m. x14d [handwritten smudged ink]",
          confidence: 0.62, // Trigger < 0.7 review highlight
        },
      ],
    },
  };

  const sample2: StoredDocument = {
    id: "doc-demo-lab-02",
    patient_id: "patient-demo-001",
    file_name: "Metabolic_Panel_Report.jpg",
    file_type: "jpg",
    mime_type: "image/jpeg",
    size_bytes: 840200,
    page_count: 1,
    doc_type: "lab_report",
    doc_date: "2026-10-09",
    doctor: "Dr. Kevin Patel",
    hospital: "Quest Diagnostics",
    status: "needs_review",
    confidence_score: 78, // Triggers < 80 document banner
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    storage_path: "documents/patient-demo-001/doc-demo-lab-02.jpg",
    draft_json: {
      document_type: "lab_report",
      confidence_score: 78,
      lab_name: "Quest Diagnostics - Clinical Pathology",
      doctor_name: "Dr. Kevin Patel, Internal Medicine",
      document_date: "2026-10-09",
      lab_results: [
        {
          test_name: "Hemoglobin A1c",
          value: "7.2",
          unit: "%",
          reference_range: "4.0 - 5.6",
          flag: "high",
          evidence_text: "HbA1c: 7.2% [HIGH] Ref: 4.0-5.6%",
          confidence: 0.94,
        },
        {
          test_name: "Fasting Blood Glucose",
          value: "142",
          unit: "mg/dL",
          reference_range: "70 - 99",
          flag: "high",
          evidence_text: "GLUC FASTING: 142 mg/dL (Critical Alert)",
          confidence: 0.88,
        },
        {
          test_name: "Estimated GFR (eGFR)",
          value: "58",
          unit: "mL/min/1.73m2",
          reference_range: "> 60",
          flag: "low",
          evidence_text: "eGFR CKD-EPI: ~58? [faint pencil mark]",
          confidence: 0.58, // Trigger < 0.7 review highlight
        },
        {
          test_name: "Serum Creatinine",
          value: "1.35",
          unit: "mg/dL",
          reference_range: "0.70 - 1.30",
          flag: "high",
          evidence_text: "Creatinine: 1.35 mg/dL [H]",
          confidence: 0.91,
        },
      ],
    },
  };

  globalDocStore.__medicare_documents.set(sample1.id, sample1);
  globalDocStore.__medicare_documents.set(sample2.id, sample2);
}

export const documentsStore = {
  getAll(): StoredDocument[] {
    return Array.from(globalDocStore.__medicare_documents!.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getById(id: string): StoredDocument | undefined {
    return globalDocStore.__medicare_documents!.get(id);
  },

  save(doc: StoredDocument): StoredDocument {
    doc.updated_at = new Date().toISOString();
    globalDocStore.__medicare_documents!.set(doc.id, doc);
    return doc;
  },

  updateStatus(id: string, status: DocumentStatus, updates?: Partial<StoredDocument>): StoredDocument | null {
    const existing = globalDocStore.__medicare_documents!.get(id);
    if (!existing) return null;

    const updated: StoredDocument = {
      ...existing,
      ...updates,
      status,
      updated_at: new Date().toISOString(),
    };
    globalDocStore.__medicare_documents!.set(id, updated);
    return updated;
  },
};
