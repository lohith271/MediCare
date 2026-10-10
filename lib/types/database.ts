export type UserRole = "patient" | "doctor" | "admin";

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type Sex = "male" | "female" | "other";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  dob?: string;
  sex?: Sex;
  phone?: string;
  blood_group?: BloodGroup;
  health_id: string;
  emergency_enabled: boolean;
  emergency_fields: string[];
  emergency_access_hours: number;
  created_at?: string;
}

export interface DoctorProfile {
  user_id: string;
  license_no: string;
  hospital: string;
  verified: boolean;
  created_at?: string;
}

export interface TrustedContact {
  id: string;
  patient_id: string;
  name: string;
  email: string;
  relation: string;
  created_at?: string;
}

export type DocumentType = "prescription" | "lab_report" | "discharge_summary" | "other";
export type DocumentStatus = "uploaded" | "extracting" | "needs_review" | "confirmed" | "failed";

export interface DocumentRecord {
  id: string;
  patient_id: string;
  storage_path: string;
  file_type: string;
  page_count?: number | null;
  doc_type: DocumentType;
  doc_date?: string | null;
  doctor?: string | null;
  hospital?: string | null;
  status: DocumentStatus;
  confidence_score?: number | null;
  draft_json?: Record<string, unknown> | null;
  created_at?: string;
}

export interface MedicationRecord {
  id: string;
  patient_id: string;
  document_id?: string | null;
  page_number?: number | null;
  evidence_text: string;
  name_as_written: string;
  ingredients: string[];
  strength?: string | null;
  dose?: string | null;
  frequency?: string | null;
  duration_days?: number | null;
  patient_marked_stopped: boolean;
  stopped_on?: string | null;
  confidence: number;
  confirmed: boolean;
  created_at?: string;
  // Joined document fields
  doc_date?: string | null;
  doc_type?: DocumentType;
  doctor?: string | null;
  hospital?: string | null;
}

export interface DiagnosisRecord {
  id: string;
  patient_id: string;
  document_id?: string | null;
  page_number?: number | null;
  evidence_text: string;
  name_as_written: string;
  name_canonical: string;
  confidence: number;
  confirmed: boolean;
  created_at?: string;
  // Joined document fields
  doc_date?: string | null;
  doc_type?: DocumentType;
  doctor?: string | null;
  hospital?: string | null;
}

export interface AllergyRecord {
  id: string;
  patient_id: string;
  source_type: "document" | "patient";
  document_id?: string | null;
  page_number?: number | null;
  evidence_text: string;
  substance: string;
  reaction?: string | null;
  created_on?: string;
  confidence: number;
  confirmed: boolean;
  created_at?: string;
  // Joined document fields
  doc_date?: string | null;
  doc_type?: DocumentType;
  doctor?: string | null;
  hospital?: string | null;
}

export interface LabResultRecord {
  id: string;
  patient_id: string;
  document_id?: string | null;
  page_number?: number | null;
  evidence_text: string;
  test_name: string;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
  ref_range?: string | null;
  flag?: string | null;
  taken_on?: string | null;
  lab_name?: string | null;
  confidence: number;
  confirmed: boolean;
  created_at?: string;
  // Joined document fields
  doc_date?: string | null;
  doc_type?: DocumentType;
  doctor?: string | null;
  hospital?: string | null;
}

export interface EncounterRecord {
  id: string;
  patient_id: string;
  document_id?: string | null;
  kind: "visit" | "admission";
  start_date?: string | null;
  end_date?: string | null;
  reason?: string | null;
  procedures?: string[];
  confirmed: boolean;
  created_at?: string;
  // Joined document fields
  doc_date?: string | null;
  doc_type?: DocumentType;
  doctor?: string | null;
  hospital?: string | null;
}

export interface BrandGenericMap {
  brand_name: string;
  generic_name: string;
  ingredients: string[];
}

export interface RetestRule {
  test_pattern: string;
  min_days: number;
  note: string;
}

export interface InteractionRule {
  drug_a: string;
  drug_b: string;
  severity: "high" | "moderate" | "low";
  note: string;
}

export interface TestConditionMap {
  test_pattern: string;
  condition_canonical: string;
}

