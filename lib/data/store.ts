import {
  Profile,
  TrustedContact,
  Diagnosis,
  Medication,
  Encounter,
  LabResult,
  FollowUpAppointment,
  MedicalDocument,
} from "@/lib/types/database";
import { createAdminClient } from "@/lib/supabase/server";

// In-memory demo store to ensure zero-setup instant demo stability
export interface PatientDataStore {
  profile: Profile;
  trustedContacts: TrustedContact[];
  diagnoses: Diagnosis[];
  medications: Medication[];
  encounters: Encounter[];
  labResults: LabResult[];
  appointments: FollowUpAppointment[];
  medicalDocuments: MedicalDocument[];
}

const DEFAULT_PATIENT_ID = "demo-patient-001";

const initialStore: PatientDataStore = {
  profile: {
    id: DEFAULT_PATIENT_ID,
    role: "patient",
    full_name: "Ramesh Sharma",
    dob: "1978-04-12",
    sex: "male",
    phone: "+919876543210",
    blood_group: "B+",
    health_id: "MED987654321",
    emergency_enabled: true,
    emergency_fields: ["blood_group", "allergies", "conditions", "medications"],
    emergency_access_hours: 24,
    created_at: "2026-01-10T08:00:00Z",
  },
  trustedContacts: [
    {
      id: "tc-001",
      patient_id: DEFAULT_PATIENT_ID,
      name: "Sunita Sharma",
      email: "sunita.sharma@demo.medicare",
      relation: "Spouse",
      created_at: "2026-01-12T10:00:00Z",
    },
    {
      id: "tc-002",
      patient_id: DEFAULT_PATIENT_ID,
      name: "Rahul Sharma",
      email: "rahul.sharma@demo.medicare",
      relation: "Son",
      created_at: "2026-02-05T14:30:00Z",
    },
  ],
  diagnoses: [
    {
      id: "diag-001",
      patient_id: DEFAULT_PATIENT_ID,
      name_as_written: "Type 2 Diabetes Mellitus (T2DM)",
      name_canonical: "Type 2 Diabetes Mellitus",
      diagnosed_date: "2026-01-15",
      doctor_name: "Dr. Priya Patel",
      hospital: "Metro General Hospital",
      notes: "Diagnosed with uncontrolled hyperglycemia. Advised oral hypoglycemics and lifestyle modifications.",
      status: "active",
      confidence: 0.98,
      confirmed: true,
      created_at: "2026-01-15T11:00:00Z",
    },
    {
      id: "diag-002",
      patient_id: DEFAULT_PATIENT_ID,
      name_as_written: "Essential Primary Hypertension",
      name_canonical: "Essential Hypertension",
      diagnosed_date: "2026-03-20",
      doctor_name: "Dr. Priya Patel",
      hospital: "Metro General Hospital",
      notes: "Stage 1 essential hypertension documented during bi-monthly checkup. Started on Telmisartan.",
      status: "active",
      confidence: 0.95,
      confirmed: true,
      created_at: "2026-03-20T09:30:00Z",
    },
    {
      id: "diag-003",
      patient_id: DEFAULT_PATIENT_ID,
      name_as_written: "Mild Dyslipidemia",
      name_canonical: "Hyperlipidemia",
      diagnosed_date: "2026-07-08",
      doctor_name: "Dr. Rajesh Kumar",
      hospital: "Apex Heart & Diabetes Clinic",
      notes: "Borderline high LDL cholesterol (138 mg/dL). Monitored through dietary management.",
      status: "monitored",
      confidence: 0.92,
      confirmed: true,
      created_at: "2026-07-08T16:00:00Z",
    },
  ],
  medications: [
    {
      id: "med-001",
      patient_id: DEFAULT_PATIENT_ID,
      name_as_written: "Tab. Metformin 500mg",
      ingredients: ["metformin"],
      strength: "500 mg",
      dose: "1 tablet",
      frequency: "Twice daily after meals (1-0-1)",
      duration_days: 90,
      prescribed_by: "Dr. Priya Patel",
      hospital: "Metro General Hospital",
      start_date: "2026-09-15",
      patient_marked_stopped: false,
      confidence: 0.99,
      confirmed: true,
      created_at: "2026-09-15T10:00:00Z",
    },
    {
      id: "med-002",
      patient_id: DEFAULT_PATIENT_ID,
      name_as_written: "Tab. Telmisartan 40mg",
      ingredients: ["telmisartan"],
      strength: "40 mg",
      dose: "1 tablet",
      frequency: "Once daily morning (1-0-0)",
      duration_days: 90,
      prescribed_by: "Dr. Priya Patel",
      hospital: "Metro General Hospital",
      start_date: "2026-09-15",
      patient_marked_stopped: false,
      confidence: 0.99,
      confirmed: true,
      created_at: "2026-09-15T10:00:00Z",
    },
    {
      id: "med-003",
      patient_id: DEFAULT_PATIENT_ID,
      name_as_written: "Tab. Glimepiride 1mg",
      ingredients: ["glimepiride"],
      strength: "1 mg",
      dose: "1 tablet",
      frequency: "Once daily before breakfast (1-0-0)",
      duration_days: 60,
      prescribed_by: "Dr. Rajesh Kumar",
      hospital: "Apex Heart & Diabetes Clinic",
      start_date: "2026-08-10",
      patient_marked_stopped: false,
      confidence: 0.94,
      confirmed: true,
      created_at: "2026-08-10T11:30:00Z",
    },
  ],
  encounters: [
    {
      id: "enc-001",
      patient_id: DEFAULT_PATIENT_ID,
      kind: "consultation",
      start_date: "2026-09-15T10:30:00Z",
      doctor_name: "Dr. Priya Patel",
      hospital: "Metro General Hospital",
      reason: "Quarterly Diabetes and Hypertension Evaluation",
      notes:
        "Patient presents for routine follow-up. Blood pressure reading today is 132/84 mmHg. Fasting blood sugar logs show good improvement from previous quarter. Mild post-exercise soreness reported. Adherence to Metformin and Telmisartan confirmed. Advised to continue moderate aerobic exercise 30 minutes 5 days a week.",
      diagnoses: ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
      procedures: ["Blood Pressure Evaluation", "Foot Examination for Neuropathy"],
      prescriptions: [
        {
          name: "Metformin",
          dosage: "500 mg",
          frequency: "Twice daily after food (1-0-1)",
          duration: "90 days",
          instructions: "Take with breakfast and dinner to minimize GI discomfort.",
        },
        {
          name: "Telmisartan",
          dosage: "40 mg",
          frequency: "Once daily morning (1-0-0)",
          duration: "90 days",
          instructions: "Take consistently at 8:00 AM.",
        },
      ],
      next_visit_date: "2026-10-18",
      next_visit_notes: "Follow-up HbA1c review and repeat lipid panel check.",
      next_visit_status: "upcoming",
      confirmed: true,
      created_at: "2026-09-15T11:15:00Z",
    },
    {
      id: "enc-002",
      patient_id: DEFAULT_PATIENT_ID,
      kind: "visit",
      start_date: "2026-08-10T14:00:00Z",
      doctor_name: "Dr. Rajesh Kumar",
      hospital: "Apex Heart & Diabetes Clinic",
      reason: "Second Opinion on Glycemic Control & Cardiovascular Risk",
      notes:
        "Comprehensive cardiometabolic review. ECG shows normal sinus rhythm. Reviewed 3-month HbA1c showing 7.5%. Added low-dose Glimepiride 1mg to target morning fasting spikes. Instructed on recognition of hypoglycemic episodes.",
      diagnoses: ["Type 2 Diabetes Mellitus", "Mild Dyslipidemia"],
      procedures: ["12-lead Electrocardiogram (ECG)", "Biothesiometry"],
      prescriptions: [
        {
          name: "Glimepiride",
          dosage: "1 mg",
          frequency: "Once daily before breakfast (1-0-0)",
          duration: "60 days",
          instructions: "Consume breakfast within 15 minutes of taking.",
        },
      ],
      next_visit_date: "2026-11-12",
      next_visit_notes: "Cardiovascular risk reassessment and repeat renal panel.",
      next_visit_status: "upcoming",
      confirmed: true,
      created_at: "2026-08-10T15:00:00Z",
    },
  ],
  labResults: [
    // Fasting Blood Glucose
    {
      id: "lab-001",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Fasting Blood Glucose",
      value_num: 168,
      value_text: "168",
      unit: "mg/dL",
      ref_range: "70 - 99 mg/dL",
      flag: "high",
      taken_on: "2026-04-10",
      lab_name: "Metropolis Diagnostics",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-04-10T08:00:00Z",
    },
    {
      id: "lab-002",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Fasting Blood Glucose",
      value_num: 152,
      value_text: "152",
      unit: "mg/dL",
      ref_range: "70 - 99 mg/dL",
      flag: "high",
      taken_on: "2026-06-12",
      lab_name: "Metropolis Diagnostics",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-06-12T08:30:00Z",
    },
    {
      id: "lab-003",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Fasting Blood Glucose",
      value_num: 138,
      value_text: "138",
      unit: "mg/dL",
      ref_range: "70 - 99 mg/dL",
      flag: "high",
      taken_on: "2026-08-05",
      lab_name: "Apex Central Pathology",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-08-05T07:45:00Z",
    },
    {
      id: "lab-004",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Fasting Blood Glucose",
      value_num: 124,
      value_text: "124",
      unit: "mg/dL",
      ref_range: "70 - 99 mg/dL",
      flag: "high",
      taken_on: "2026-09-20",
      lab_name: "Metro Hospital Labs",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-09-20T08:15:00Z",
    },
    {
      id: "lab-005",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Fasting Blood Glucose",
      value_num: 114,
      value_text: "114",
      unit: "mg/dL",
      ref_range: "70 - 99 mg/dL",
      flag: "high",
      taken_on: "2026-10-06",
      lab_name: "Metro Hospital Labs",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-10-06T08:00:00Z",
    },

    // Postprandial Blood Glucose
    {
      id: "lab-006",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Postprandial Blood Glucose (PPBS)",
      value_num: 220,
      value_text: "220",
      unit: "mg/dL",
      ref_range: "< 140 mg/dL",
      flag: "high",
      taken_on: "2026-04-10",
      lab_name: "Metropolis Diagnostics",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-04-10T12:00:00Z",
    },
    {
      id: "lab-007",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Postprandial Blood Glucose (PPBS)",
      value_num: 195,
      value_text: "195",
      unit: "mg/dL",
      ref_range: "< 140 mg/dL",
      flag: "high",
      taken_on: "2026-06-12",
      lab_name: "Metropolis Diagnostics",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-06-12T12:15:00Z",
    },
    {
      id: "lab-008",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Postprandial Blood Glucose (PPBS)",
      value_num: 176,
      value_text: "176",
      unit: "mg/dL",
      ref_range: "< 140 mg/dL",
      flag: "high",
      taken_on: "2026-08-05",
      lab_name: "Apex Central Pathology",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-08-05T12:00:00Z",
    },
    {
      id: "lab-009",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Postprandial Blood Glucose (PPBS)",
      value_num: 156,
      value_text: "156",
      unit: "mg/dL",
      ref_range: "< 140 mg/dL",
      flag: "high",
      taken_on: "2026-09-20",
      lab_name: "Metro Hospital Labs",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-09-20T12:30:00Z",
    },
    {
      id: "lab-010",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Postprandial Blood Glucose (PPBS)",
      value_num: 142,
      value_text: "142",
      unit: "mg/dL",
      ref_range: "< 140 mg/dL",
      flag: "high",
      taken_on: "2026-10-06",
      lab_name: "Metro Hospital Labs",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-10-06T12:00:00Z",
    },

    // HbA1c
    {
      id: "lab-011",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "HbA1c (Glycated Hemoglobin)",
      value_num: 8.8,
      value_text: "8.8",
      unit: "%",
      ref_range: "< 5.7 %",
      flag: "high",
      taken_on: "2026-01-15",
      lab_name: "Metropolis Diagnostics",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-01-15T08:00:00Z",
    },
    {
      id: "lab-012",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "HbA1c (Glycated Hemoglobin)",
      value_num: 8.2,
      value_text: "8.2",
      unit: "%",
      ref_range: "< 5.7 %",
      flag: "high",
      taken_on: "2026-04-10",
      lab_name: "Metropolis Diagnostics",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-04-10T08:30:00Z",
    },
    {
      id: "lab-013",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "HbA1c (Glycated Hemoglobin)",
      value_num: 7.5,
      value_text: "7.5",
      unit: "%",
      ref_range: "< 5.7 %",
      flag: "high",
      taken_on: "2026-07-08",
      lab_name: "Apex Central Pathology",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-07-08T08:00:00Z",
    },
    {
      id: "lab-014",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "HbA1c (Glycated Hemoglobin)",
      value_num: 6.9,
      value_text: "6.9",
      unit: "%",
      ref_range: "< 5.7 %",
      flag: "normal",
      taken_on: "2026-10-02",
      lab_name: "Metro Hospital Labs",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-10-02T09:00:00Z",
    },

    // Blood Pressure
    {
      id: "lab-015",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Blood Pressure (Systolic)",
      value_num: 150,
      value_text: "150/95",
      unit: "mmHg",
      ref_range: "< 120 mmHg",
      flag: "high",
      taken_on: "2026-04-10",
      lab_name: "Metro Hospital Clinic",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-04-10T10:00:00Z",
    },
    {
      id: "lab-016",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Blood Pressure (Diastolic)",
      value_num: 95,
      value_text: "150/95",
      unit: "mmHg",
      ref_range: "< 80 mmHg",
      flag: "high",
      taken_on: "2026-04-10",
      lab_name: "Metro Hospital Clinic",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-04-10T10:00:00Z",
    },
    {
      id: "lab-017",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Blood Pressure (Systolic)",
      value_num: 142,
      value_text: "142/90",
      unit: "mmHg",
      ref_range: "< 120 mmHg",
      flag: "high",
      taken_on: "2026-06-12",
      lab_name: "Metro Hospital Clinic",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-06-12T10:00:00Z",
    },
    {
      id: "lab-018",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Blood Pressure (Diastolic)",
      value_num: 90,
      value_text: "142/90",
      unit: "mmHg",
      ref_range: "< 80 mmHg",
      flag: "high",
      taken_on: "2026-06-12",
      lab_name: "Metro Hospital Clinic",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-06-12T10:00:00Z",
    },
    {
      id: "lab-019",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Blood Pressure (Systolic)",
      value_num: 136,
      value_text: "136/88",
      unit: "mmHg",
      ref_range: "< 120 mmHg",
      flag: "high",
      taken_on: "2026-08-05",
      lab_name: "Apex Heart Clinic",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-08-05T14:00:00Z",
    },
    {
      id: "lab-020",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Blood Pressure (Diastolic)",
      value_num: 88,
      value_text: "136/88",
      unit: "mmHg",
      ref_range: "< 80 mmHg",
      flag: "high",
      taken_on: "2026-08-05",
      lab_name: "Apex Heart Clinic",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-08-05T14:00:00Z",
    },
    {
      id: "lab-021",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Blood Pressure (Systolic)",
      value_num: 132,
      value_text: "132/84",
      unit: "mmHg",
      ref_range: "< 120 mmHg",
      flag: "high",
      taken_on: "2026-09-15",
      lab_name: "Metro Hospital Clinic",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-09-15T10:30:00Z",
    },
    {
      id: "lab-022",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Blood Pressure (Diastolic)",
      value_num: 84,
      value_text: "132/84",
      unit: "mmHg",
      ref_range: "< 80 mmHg",
      flag: "high",
      taken_on: "2026-09-15",
      lab_name: "Metro Hospital Clinic",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-09-15T10:30:00Z",
    },
    {
      id: "lab-023",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Blood Pressure (Systolic)",
      value_num: 124,
      value_text: "124/80",
      unit: "mmHg",
      ref_range: "< 120 mmHg",
      flag: "normal",
      taken_on: "2026-10-06",
      lab_name: "Metro Hospital Clinic",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-10-06T09:00:00Z",
    },
    {
      id: "lab-024",
      patient_id: DEFAULT_PATIENT_ID,
      test_name: "Blood Pressure (Diastolic)",
      value_num: 80,
      value_text: "124/80",
      unit: "mmHg",
      ref_range: "< 80 mmHg",
      flag: "normal",
      taken_on: "2026-10-06",
      lab_name: "Metro Hospital Clinic",
      confidence: 1.0,
      confirmed: true,
      created_at: "2026-10-06T09:00:00Z",
    },
  ],
  appointments: [
    {
      id: "app-001",
      encounter_id: "enc-001",
      patient_id: DEFAULT_PATIENT_ID,
      doctor_name: "Dr. Priya Patel",
      hospital: "Metro General Hospital",
      scheduled_date: "2026-10-18",
      scheduled_time: "10:30 AM",
      reason: "Follow-up HbA1c review and blood pressure assessment",
      instructions: "Fast for 10-12 hours prior for routine repeat metabolic blood test.",
      status: "upcoming",
      created_at: "2026-09-15T11:15:00Z",
    },
    {
      id: "app-002",
      encounter_id: "enc-002",
      patient_id: DEFAULT_PATIENT_ID,
      doctor_name: "Dr. Rajesh Kumar",
      hospital: "Apex Heart & Diabetes Clinic",
      scheduled_date: "2026-11-12",
      scheduled_time: "02:00 PM",
      reason: "Cardiometabolic checkup and renal profile screening",
      instructions: "Bring recent home blood glucose logbook.",
      status: "upcoming",
      created_at: "2026-08-10T15:00:00Z",
    },
  ],
  medicalDocuments: [
    {
      id: "doc-001",
      patient_id: DEFAULT_PATIENT_ID,
      title: "Chest Radiograph (X-Ray PA View)",
      category: "xray",
      file_name: "Chest_XRay_PA_Aug2026.jpg",
      file_type: "image/jpeg",
      file_size_bytes: 2450000,
      file_url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
      doc_date: "2026-08-10",
      doctor: "Dr. Priya Patel",
      hospital: "Metro General Hospital Imaging Dept",
      notes: "Posteroanterior projection. Normal lung parenchyma, no infiltrates or consolidations. Normal cardiothoracic ratio.",
      created_at: "2026-08-10T14:30:00Z",
    },
    {
      id: "doc-002",
      patient_id: DEFAULT_PATIENT_ID,
      title: "Lumbar Spine MRI Scan (Sagittal & Axial T2)",
      category: "mri_ct",
      file_name: "Lumbar_MRI_May2026.jpg",
      file_type: "image/jpeg",
      file_size_bytes: 4800000,
      file_url: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=1200&q=80",
      doc_date: "2026-05-18",
      doctor: "Dr. Anil Mehta",
      hospital: "Apex Diagnostic Imaging & MRI Center",
      notes: "High-resolution 1.5T MRI. L4-L5 disc contour demonstrates mild degenerative bulge without nerve root compression.",
      created_at: "2026-05-18T11:00:00Z",
    },
    {
      id: "doc-003",
      patient_id: DEFAULT_PATIENT_ID,
      title: "Abdominal Ultrasound Examination",
      category: "ultrasound",
      file_name: "Abdominal_Ultrasound_Jun2026.jpg",
      file_type: "image/jpeg",
      file_size_bytes: 1850000,
      file_url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
      doc_date: "2026-06-20",
      doctor: "Dr. Rajesh Kumar",
      hospital: "Apex Diagnostic Center",
      notes: "Upper abdomen sonogram. Liver demonstrates diffuse Grade 1 fatty infiltration. Gallbladder and kidneys normal bilaterally.",
      created_at: "2026-06-20T16:15:00Z",
    },
    {
      id: "doc-004",
      patient_id: DEFAULT_PATIENT_ID,
      title: "Comprehensive Metabolic Panel & HbA1c Report (PDF)",
      category: "lab_pdf",
      file_name: "Metabolic_Panel_Sept2026.pdf",
      file_type: "application/pdf",
      file_size_bytes: 620000,
      file_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      doc_date: "2026-09-15",
      doctor: "Dr. Priya Patel",
      hospital: "Metro Hospital Pathology Labs",
      notes: "Complete metabolic panel, lipid profile, and HbA1c level (6.9%). Fasting blood glucose 114 mg/dL.",
      created_at: "2026-09-15T09:00:00Z",
    },
    {
      id: "doc-005",
      patient_id: DEFAULT_PATIENT_ID,
      title: "Discharge Summary & Titration Protocol (PDF)",
      category: "discharge_summary",
      file_name: "Discharge_Summary_Jan2026.pdf",
      file_type: "application/pdf",
      file_size_bytes: 850000,
      file_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      doc_date: "2026-01-20",
      doctor: "Dr. Priya Patel",
      hospital: "Metro General Hospital",
      notes: "Comprehensive hospital discharge summary detailing initial diagnosis, IV insulin protocol, and transition to oral Metformin BD.",
      created_at: "2026-01-20T17:00:00Z",
    },
  ],
};

// Global in-memory singleton
declare global {
  // eslint-disable-next-line no-var
  var __MEDICARE_STORE__: PatientDataStore | undefined;
}

export function getStore(): PatientDataStore {
  if (!globalThis.__MEDICARE_STORE__) {
    // Clone initialStore
    globalThis.__MEDICARE_STORE__ = JSON.parse(JSON.stringify(initialStore));
  }
  return globalThis.__MEDICARE_STORE__!;
}

// -------------------------------------------------------------
// Database Sync / Store Helper Functions
// -------------------------------------------------------------

export async function getPatientProfile(patientId: string): Promise<Profile> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", patientId)
      .maybeSingle();

    if (!error && data) {
      return data as Profile;
    }
  } catch {
    // fallback
  }

  const store = getStore();
  if (store.profile.id === patientId || patientId === DEFAULT_PATIENT_ID) {
    return store.profile;
  }
  return {
    id: patientId,
    role: "patient",
    full_name: "Patient User",
    dob: undefined,
    sex: undefined,
    phone: undefined,
    blood_group: undefined,
    health_id: `MED${patientId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 9).toUpperCase()}`,
    emergency_enabled: true,
    emergency_fields: ["blood_group", "allergies", "conditions", "medications"],
    emergency_access_hours: 24,
    created_at: new Date().toISOString(),
  };
}

export async function updatePatientProfile(
  patientId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  const store = getStore();
  let updated: Profile;
  if (store.profile.id === patientId || patientId === DEFAULT_PATIENT_ID) {
    updated = {
      ...store.profile,
      ...updates,
      id: patientId,
    };
    store.profile = updated;
  } else {
    const current = await getPatientProfile(patientId);
    updated = {
      ...current,
      ...updates,
      id: patientId,
    };
  }

  try {
    const supabase = createAdminClient();
    await supabase.from("profiles").upsert(updated).eq("id", patientId);
  } catch {
    // Fallback silent
  }

  return updated;
}

export async function getTrustedContacts(patientId: string): Promise<TrustedContact[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("trusted_contacts")
      .select("*")
      .eq("patient_id", patientId);

    if (!error && data) {
      return data as TrustedContact[];
    }
  } catch {
    // fallback
  }

  const store = getStore();
  if (patientId === DEFAULT_PATIENT_ID) {
    return store.trustedContacts;
  }
  return store.trustedContacts.filter((c) => c.patient_id === patientId);
}

export async function addTrustedContact(
  patientId: string,
  contact: { name: string; email: string; relation: string }
): Promise<TrustedContact> {
  const newContact: TrustedContact = {
    id: `tc-${Date.now()}`,
    patient_id: patientId,
    name: contact.name,
    email: contact.email,
    relation: contact.relation,
    created_at: new Date().toISOString(),
  };

  const store = getStore();
  store.trustedContacts.push(newContact);

  try {
    const supabase = createAdminClient();
    await supabase.from("trusted_contacts").insert(newContact);
  } catch {
    // fallback
  }

  return newContact;
}

export async function deleteTrustedContact(contactId: string): Promise<boolean> {
  const store = getStore();
  store.trustedContacts = store.trustedContacts.filter((c) => c.id !== contactId);

  try {
    const supabase = createAdminClient();
    await supabase.from("trusted_contacts").delete().eq("id", contactId);
  } catch {
    // fallback
  }

  return true;
}

export async function getEncounters(patientId: string): Promise<Encounter[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("encounters")
      .select("*")
      .eq("patient_id", patientId)
      .order("start_date", { ascending: false });

    if (!error && data) {
      return data as Encounter[];
    }
  } catch {
    // fallback
  }

  const store = getStore();
  if (patientId === DEFAULT_PATIENT_ID) {
    return store.encounters.sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }
  return store.encounters
    .filter((e) => e.patient_id === patientId)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
}

export async function createEncounter(
  patientId: string,
  encounterData: Partial<Encounter>
): Promise<Encounter> {
  const store = getStore();
  const id = `enc-${Date.now()}`;
  const newEncounter: Encounter = {
    id,
    patient_id: patientId,
    kind: encounterData.kind || "consultation",
    start_date: encounterData.start_date || new Date().toISOString(),
    doctor_name: encounterData.doctor_name || "Doctor Consultation",
    hospital: encounterData.hospital || "General Clinic",
    reason: encounterData.reason || "",
    notes: encounterData.notes || "",
    diagnoses: encounterData.diagnoses || [],
    procedures: encounterData.procedures || [],
    prescriptions: encounterData.prescriptions || [],
    next_visit_date: encounterData.next_visit_date || null,
    next_visit_notes: encounterData.next_visit_notes || null,
    next_visit_status: encounterData.next_visit_date ? "upcoming" : undefined,
    confirmed: true,
    created_at: new Date().toISOString(),
  };

  store.encounters.unshift(newEncounter);

  // If next visit is scheduled, also create a FollowUpAppointment entry
  if (newEncounter.next_visit_date) {
    const newAppointment: FollowUpAppointment = {
      id: `app-${Date.now()}`,
      encounter_id: id,
      patient_id: patientId,
      doctor_name: newEncounter.doctor_name || "Doctor",
      hospital: newEncounter.hospital || "Clinic",
      scheduled_date: newEncounter.next_visit_date,
      scheduled_time: "10:00 AM",
      reason: newEncounter.next_visit_notes || `Follow-up with ${newEncounter.doctor_name}`,
      instructions: "Bring all recent test reports and medications.",
      status: "upcoming",
      created_at: new Date().toISOString(),
    };
    store.appointments.unshift(newAppointment);
  }

  // If diagnoses were added, also ensure they are saved to Diagnoses list
  if (newEncounter.diagnoses && newEncounter.diagnoses.length > 0) {
    for (const diagName of newEncounter.diagnoses) {
      const exists = store.diagnoses.some(
        (d) => d.patient_id === patientId && d.name_canonical.toLowerCase() === diagName.toLowerCase()
      );
      if (!exists) {
        store.diagnoses.unshift({
          id: `diag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          patient_id: patientId,
          name_as_written: diagName,
          name_canonical: diagName,
          diagnosed_date: newEncounter.start_date.split("T")[0],
          doctor_name: newEncounter.doctor_name || undefined,
          hospital: newEncounter.hospital || undefined,
          notes: `Identified during consultation: ${newEncounter.reason || ""}`,
          status: "active",
          confidence: 1.0,
          confirmed: true,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  // If medications were prescribed, also ensure they are added to Medications list
  if (newEncounter.prescriptions && newEncounter.prescriptions.length > 0) {
    for (const rx of newEncounter.prescriptions) {
      store.medications.unshift({
        id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        patient_id: patientId,
        name_as_written: rx.name,
        ingredients: [rx.name.toLowerCase().replace(/tab\.?|cap\.?|syp\.?|inj\.?/g, "").trim()],
        strength: rx.dosage,
        dose: rx.dosage,
        frequency: rx.frequency,
        duration_days: parseInt(rx.duration) || 30,
        prescribed_by: newEncounter.doctor_name || undefined,
        hospital: newEncounter.hospital || undefined,
        start_date: newEncounter.start_date.split("T")[0],
        patient_marked_stopped: false,
        confidence: 1.0,
        confirmed: true,
        created_at: new Date().toISOString(),
      });
    }
  }

  try {
    const supabase = createAdminClient();
    await supabase.from("encounters").insert(newEncounter);
  } catch {
    // fallback
  }

  return newEncounter;
}

export async function getDiagnoses(patientId: string): Promise<Diagnosis[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("diagnoses")
      .select("*")
      .eq("patient_id", patientId)
      .order("diagnosed_date", { ascending: false });

    if (!error && data) {
      return data as Diagnosis[];
    }
  } catch {
    // fallback
  }

  const store = getStore();
  if (patientId === DEFAULT_PATIENT_ID) {
    return store.diagnoses;
  }
  return store.diagnoses.filter((d) => d.patient_id === patientId);
}

export async function addDiagnosis(
  patientId: string,
  diagData: Partial<Diagnosis>
): Promise<Diagnosis> {
  const store = getStore();
  const newDiag: Diagnosis = {
    id: `diag-${Date.now()}`,
    patient_id: patientId,
    name_as_written: diagData.name_as_written || "Condition",
    name_canonical: diagData.name_canonical || diagData.name_as_written || "Condition",
    diagnosed_date: diagData.diagnosed_date || new Date().toISOString().split("T")[0],
    doctor_name: diagData.doctor_name || undefined,
    hospital: diagData.hospital || undefined,
    notes: diagData.notes || "",
    status: diagData.status || "active",
    confidence: 1.0,
    confirmed: true,
    created_at: new Date().toISOString(),
  };

  store.diagnoses.unshift(newDiag);

  try {
    const supabase = createAdminClient();
    await supabase.from("diagnoses").insert(newDiag);
  } catch {
    // fallback
  }

  return newDiag;
}

export async function getAppointments(patientId: string): Promise<FollowUpAppointment[]> {
  const store = getStore();
  if (patientId === DEFAULT_PATIENT_ID) {
    return store.appointments.sort(
      (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    );
  }
  return store.appointments
    .filter((a) => a.patient_id === patientId)
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "upcoming" | "completed" | "cancelled" | "overdue"
): Promise<boolean> {
  const store = getStore();
  const appt = store.appointments.find((a) => a.id === appointmentId);
  if (appt) {
    appt.status = status;
    return true;
  }
  return false;
}

export async function addAppointment(
  patientId: string,
  data: Partial<FollowUpAppointment>
): Promise<FollowUpAppointment> {
  const store = getStore();
  const newAppt: FollowUpAppointment = {
    id: `app-${Date.now()}`,
    patient_id: patientId,
    doctor_name: data.doctor_name || "Doctor",
    hospital: data.hospital || "Clinic",
    scheduled_date: data.scheduled_date || new Date().toISOString().split("T")[0],
    scheduled_time: data.scheduled_time || "10:00 AM",
    reason: data.reason || "Follow-up consultation",
    instructions: data.instructions || "Bring recent records and medications",
    status: "upcoming",
    created_at: new Date().toISOString(),
  };
  store.appointments.unshift(newAppt);
  return newAppt;
}

export async function getLabResults(patientId: string): Promise<LabResult[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("lab_results")
      .select("*")
      .eq("patient_id", patientId)
      .order("taken_on", { ascending: true });

    if (!error && data) {
      return data as LabResult[];
    }
  } catch {
    // fallback
  }

  const store = getStore();
  if (patientId === DEFAULT_PATIENT_ID) {
    return store.labResults;
  }
  return store.labResults.filter((l) => l.patient_id === patientId);
}

export async function addLabResult(
  patientId: string,
  resultData: Partial<LabResult>
): Promise<LabResult> {
  const store = getStore();
  const newResult: LabResult = {
    id: `lab-${Date.now()}`,
    patient_id: patientId,
    test_name: resultData.test_name || "Blood Test",
    value_num: Number(resultData.value_num) || 0,
    value_text: resultData.value_text || String(resultData.value_num),
    unit: resultData.unit || "mg/dL",
    ref_range: resultData.ref_range || "",
    flag: resultData.flag || "normal",
    taken_on: resultData.taken_on || new Date().toISOString().split("T")[0],
    lab_name: resultData.lab_name || "Diagnostic Laboratory",
    confidence: 1.0,
    confirmed: true,
    created_at: new Date().toISOString(),
  };

  store.labResults.push(newResult);

  try {
    const supabase = createAdminClient();
    await supabase.from("lab_results").insert(newResult);
  } catch {
    // fallback
  }

  return newResult;
}

export async function getMedicalDocuments(patientId: string): Promise<MedicalDocument[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data as any;
    }
  } catch {
    // fallback
  }

  const store = getStore();
  if (patientId === DEFAULT_PATIENT_ID) {
    return store.medicalDocuments.sort(
      (a, b) => new Date(b.doc_date).getTime() - new Date(a.doc_date).getTime()
    );
  }
  return store.medicalDocuments
    .filter((d) => d.patient_id === patientId)
    .sort((a, b) => new Date(b.doc_date).getTime() - new Date(a.doc_date).getTime());
}

export async function addMedicalDocument(
  patientId: string,
  docData: Partial<MedicalDocument>
): Promise<MedicalDocument> {
  const store = getStore();
  const id = `doc-${Date.now()}`;
  const newDoc: MedicalDocument = {
    id,
    patient_id: patientId,
    title: docData.title || "Uploaded Medical Document",
    category: docData.category || "other",
    file_name: docData.file_name || "medical_record.jpg",
    file_type: docData.file_type || "image/jpeg",
    file_size_bytes: docData.file_size_bytes || 1200000,
    file_url:
      docData.file_url ||
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
    doc_date: docData.doc_date || new Date().toISOString().split("T")[0],
    doctor: docData.doctor || undefined,
    hospital: docData.hospital || undefined,
    notes: docData.notes || "",
    created_at: new Date().toISOString(),
  };

  store.medicalDocuments.unshift(newDoc);
  return newDoc;
}

export async function deleteMedicalDocument(docId: string): Promise<boolean> {
  const store = getStore();
  store.medicalDocuments = store.medicalDocuments.filter((d) => d.id !== docId);
  return true;
}
