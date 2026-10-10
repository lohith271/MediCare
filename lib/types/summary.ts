export interface SourceReference {
  record_id?: string;
  document_id?: string;
  page_number?: number | null;
  evidence_text: string;
  doc_date?: string | null;
  doc_type?: string;
  doctor?: string | null;
  hospital?: string | null;
}

export interface SummaryAllergy {
  substance: string;
  reactions: string[];
  sources: SourceReference[];
  is_patient_reported?: boolean;
}

export type MedicationStatus =
  | "current"
  | "stopped"
  | "course_ended"
  | "not_recent"
  | "unknown_date";

export interface SummaryMedication {
  group_key: string;
  display_name: string;
  ingredients: string[];
  status: MedicationStatus;
  dose_conflict: boolean;
  warnings?: string[];
  strength?: string | null;
  dose?: string | null;
  frequency?: string | null;
  duration_days?: number | null;
  prescribed_date?: string | null;
  prescriber?: string | null;
  latest_record_id?: string;
  patient_marked_stopped?: boolean;
  stopped_on?: string | null;
  sources: SourceReference[];
}

export interface SummaryCondition {
  name_canonical: string;
  names_as_written: string[];
  first_recorded: string | null;
  last_mentioned: string | null;
  mention_count: number;
  sources: SourceReference[];
}

export interface ClinicalSummary {
  generated_at: string;
  counts: {
    allergies: number;
    current_medicines: number;
    other_medicines: number;
    conditions: number;
  };
  allergies: SummaryAllergy[];
  current_medicines: SummaryMedication[];
  other_medicines: SummaryMedication[];
  conditions: SummaryCondition[];
  disclaimer: string;
}

export interface BuildSummaryOptions {
  today?: Date | string;
  includeSources?: boolean;
}
