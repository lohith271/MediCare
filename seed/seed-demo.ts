/**
 * Creates the demo accounts and demo patient data in your Supabase project.
 *
 *   npm run seed:demo
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY
 * (or SUPABASE_SECRET_KEY) in .env.local. Safe to run again: the demo patient's
 * records are replaced each time, and the accounts are reused.
 *
 * Run this only after the migrations in supabase/migrations have been applied.
 */
import { createClient } from "@supabase/supabase-js";
import { demoPatientData } from "./demo-data.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "Password123!";

const PATIENT_ACCOUNT = {
  email: "patient@medicare.demo",
  metadata: {
    role: "patient",
    full_name: demoPatientData.profile.full_name,
    phone: demoPatientData.profile.phone,
    dob: demoPatientData.profile.dob,
    sex: demoPatientData.profile.sex,
    blood_group: demoPatientData.profile.blood_group,
    health_id: demoPatientData.profile.health_id,
  },
};

const DOCTOR_ACCOUNT = {
  email: "doctor@medicare.demo",
  metadata: {
    role: "doctor",
    full_name: "Dr. Priya Patel",
    phone: "+919812345678",
    health_id: "DOC123456789",
    license_no: "KMC-48291-MED",
    hospital: "Metro General Hospital",
  },
};

/** Creates the Auth user, or returns the existing one with its password reset to the demo password. */
async function ensureAuthUser(email: string, metadata: Record<string, unknown>): Promise<string> {
  const created = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (created.data.user) return created.data.user.id;
  if (created.error && !/already/i.test(created.error.message)) throw created.error;

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) {
      const { error: updateError } = await admin.auth.admin.updateUserById(found.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (updateError) throw updateError;
      return found.id;
    }
    if (data.users.length < 200) break;
  }
  throw new Error(`Could not create or find ${email}`);
}

function must(action: string, error: { message: string } | null) {
  if (error) throw new Error(`${action}: ${error.message}`);
}

/** Removes the `id` key so the database generates fresh UUIDs, and sets the owner. */
function withOwner<T extends { id?: string }>(rows: T[], patientId: string) {
  return rows.map(({ id: _id, ...rest }) => ({ ...rest, patient_id: patientId }));
}

async function seedPatientRecords(patientId: string) {
  const tables = [
    "allergies",
    "appointments",
    "medications",
    "diagnoses",
    "lab_results",
    "encounters",
    "trusted_contacts",
    "medical_documents",
  ] as const;
  for (const table of tables) {
    const { error } = await admin.from(table).delete().eq("patient_id", patientId);
    must(`Clearing ${table}`, error);
  }

  const d = demoPatientData;
  const inserts: Array<[string, unknown[]]> = [
    ["allergies", withOwner(d.allergies, patientId)],
    ["trusted_contacts", withOwner(d.trustedContacts, patientId)],
    ["diagnoses", withOwner(d.diagnoses, patientId)],
    ["medications", withOwner(d.medications, patientId)],
    ["encounters", withOwner(d.encounters.map((e) => ({ ...e, document_id: null })), patientId)],
    ["lab_results", withOwner(d.labResults, patientId)],
    [
      "appointments",
      withOwner(d.appointments.map(({ encounter_id: _enc, ...a }) => a), patientId),
    ],
    [
      "medical_documents",
      withOwner(
        d.medicalDocuments.map(({ file_url, ...m }) => ({ ...m, file_url })),
        patientId
      ),
    ],
  ];
  for (const [table, rows] of inserts) {
    if (rows.length === 0) continue;
    const { error } = await admin.from(table).insert(rows);
    must(`Inserting ${table}`, error);
  }
}

async function main() {
  console.log("Creating demo accounts...");
  const patientId = await ensureAuthUser(PATIENT_ACCOUNT.email, PATIENT_ACCOUNT.metadata);
  const doctorId = await ensureAuthUser(DOCTOR_ACCOUNT.email, DOCTOR_ACCOUNT.metadata);

  const p = demoPatientData.profile;
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: p.full_name,
      dob: p.dob,
      sex: p.sex,
      phone: p.phone,
      blood_group: p.blood_group,
      health_id: p.health_id,
      emergency_enabled: p.emergency_enabled,
      emergency_fields: p.emergency_fields,
      emergency_access_hours: p.emergency_access_hours,
    })
    .eq("id", patientId);
  must("Updating patient profile", profileError);

  const { error: doctorError } = await admin.from("doctor_profiles").upsert({
    user_id: doctorId,
    license_no: DOCTOR_ACCOUNT.metadata.license_no,
    hospital: DOCTOR_ACCOUNT.metadata.hospital,
    verified: true,
  });
  must("Saving doctor profile", doctorError);

  console.log("Loading demo patient records...");
  await seedPatientRecords(patientId);

  console.log("\nDemo accounts ready. Sign in on the login page with:");
  console.log(`  Patient: ${PATIENT_ACCOUNT.email}  /  ${DEMO_PASSWORD}`);
  console.log(`  Doctor:  ${DOCTOR_ACCOUNT.email}  /  ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("\nSeeding failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
