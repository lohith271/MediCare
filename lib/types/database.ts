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
