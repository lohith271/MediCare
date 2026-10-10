export type UserRole = "patient" | "doctor";

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

export interface Diagnosis {
  id: string;
  patient_id: string;
  document_id?: string | null;
  page_number?: number | null;
  evidence_text?: string | null;
  name_as_written: string;
  name_canonical: string;
  diagnosed_date?: string;
  doctor_name?: string;
  hospital?: string;
  notes?: string;
  status?: "active" | "monitored" | "resolved";
  confidence?: number;
  confirmed: boolean;
  created_at?: string;
}

export interface PrescribedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  document_id?: string | null;
  page_number?: number | null;
  evidence_text?: string | null;
  name_as_written: string;
  ingredients: string[];
  strength?: string | null;
  dose?: string | null;
  frequency?: string | null;
  duration_days?: number | null;
  prescribed_by?: string;
  hospital?: string;
  start_date?: string;
  patient_marked_stopped?: boolean;
  stopped_on?: string | null;
  confidence?: number;
  confirmed: boolean;
  created_at?: string;
}

export type EncounterKind = "visit" | "admission" | "follow_up" | "consultation";

export interface Encounter {
  id: string;
  patient_id: string;
  document_id?: string | null;
  kind: EncounterKind;
  start_date: string;
  end_date?: string | null;
  doctor_name?: string | null;
  hospital?: string | null;
  reason?: string | null;
  notes?: string | null;
  diagnoses?: string[];
  procedures?: string[];
  prescriptions?: PrescribedMedicine[];
  next_visit_date?: string | null;
  next_visit_notes?: string | null;
  next_visit_status?: "upcoming" | "completed" | "cancelled" | "overdue";
  confirmed: boolean;
  created_at?: string;
}

export type LabResultFlag = "normal" | "high" | "low" | "critical";

export interface LabResult {
  id: string;
  patient_id: string;
  document_id?: string | null;
  page_number?: number | null;
  evidence_text?: string | null;
  test_name: string;
  value_num: number;
  value_text?: string | null;
  unit: string;
  ref_range?: string | null;
  flag?: LabResultFlag;
  taken_on: string;
  lab_name?: string | null;
  confidence?: number;
  confirmed: boolean;
  created_at?: string;
}

export interface FollowUpAppointment {
  id: string;
  encounter_id?: string;
  patient_id: string;
  doctor_name: string;
  hospital: string;
  scheduled_date: string;
  scheduled_time?: string;
  reason: string;
  instructions?: string;
  status: "upcoming" | "completed" | "cancelled" | "overdue";
  created_at?: string;
}

export type MedicalDocumentCategory =
  | "xray"
  | "mri_ct"
  | "ultrasound"
  | "lab_pdf"
  | "prescription_pdf"
  | "discharge_summary"
  | "clinical_photo"
  | "other";

export interface MedicalDocument {
  id: string;
  patient_id: string;
  title: string;
  category: MedicalDocumentCategory;
  file_name: string;
  file_type: string;
  file_size_bytes?: number;
  file_url: string;
  doc_date: string;
  doctor?: string;
  hospital?: string;
  notes?: string;
  created_at?: string;
}

export interface Share {
  id: string;
  patient_id: string;
  code_hash: string;
  scope: string[];
  expires_at: string;
  revoked_at?: string | null;
  max_uses: number;
  use_count: number;
  created_at?: string;
}

export type EmergencyRequestStatus = "pending" | "approved" | "declined" | "expired";

export interface EmergencyRequest {
  id: string;
  doctor_id: string;
  patient_id: string;
  reason: string;
  status: EmergencyRequestStatus;
  request_expires_at: string;
  access_expires_at?: string | null;
  created_at?: string;
}

export interface ApprovalToken {
  id: string;
  request_id: string;
  contact_id?: string | null;
  token_hash: string;
  used_at?: string | null;
  expires_at: string;
  created_at?: string;
}

export interface AccessLog {
  id: string;
  patient_id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  detail?: Record<string, any>;
  ip?: string;
  created_at?: string;
}

export interface InboxItem {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  link?: string | null;
  created_at?: string;
}

export interface RateLimit {
  key: string;
  window_start: string;
  count: number;
}

// -------------------------------------------------------------
// Member 3 Clinical Summary & Extraction Database Record Types
// -------------------------------------------------------------

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
