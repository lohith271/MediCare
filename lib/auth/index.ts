import { Profile, DoctorProfile, UserRole } from "@/lib/types";

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  profile: Profile;
  doctorProfile?: DoctorProfile;
}

export const DEMO_CREDENTIALS = {
  patient: {
    email: "patient@medicare.demo",
    password: "Password123!",
    role: "patient" as UserRole,
    profile: {
      id: "demo-patient-001",
      role: "patient" as UserRole,
      full_name: "Ramesh Sharma",
      dob: "1978-04-12",
      sex: "male" as const,
      phone: "+919876543210",
      blood_group: "B+" as const,
      health_id: "MED987654321",
      emergency_enabled: true,
      emergency_fields: ["blood_group", "allergies", "conditions", "medications"],
      emergency_access_hours: 24,
    },
  },
  doctor: {
    email: "doctor@medicare.demo",
    password: "Password123!",
    role: "doctor" as UserRole,
    profile: {
      id: "demo-doctor-001",
      role: "doctor" as UserRole,
      full_name: "Dr. Priya Patel",
      phone: "+919812345678",
      health_id: "DOC123456789",
      emergency_enabled: false,
      emergency_fields: [],
      emergency_access_hours: 0,
    },
    doctorProfile: {
      user_id: "demo-doctor-001",
      license_no: "KMC-48291-MED",
      hospital: "Metro General Hospital",
      verified: true,
    },
  },
  admin: {
    email: "admin@medicare.demo",
    password: "Password123!",
    role: "admin" as UserRole,
    profile: {
      id: "demo-admin-001",
      role: "admin" as UserRole,
      full_name: "System Administrator",
      phone: "+919900000000",
      health_id: "ADM000000001",
      emergency_enabled: false,
      emergency_fields: [],
      emergency_access_hours: 0,
    },
  },
};

const SESSION_STORAGE_KEY = "medicare_demo_session";

export function getLocalSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearLocalSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
