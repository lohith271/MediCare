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
