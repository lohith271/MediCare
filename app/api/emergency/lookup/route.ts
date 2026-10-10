import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { sendEmail } from "@/lib/email/adapter";
import { logAccess } from "@/lib/access/log";
import { errorResponse, requireSignedInDoctor } from "@/lib/access/patient-access";

// Helper to mask name into initials (e.g. "Ramesh Sharma" -> "R. S.")
function maskName(fullName: string): string {
  if (!fullName) return "P. R.";
  return fullName
    .trim()
    .split(/\s+/)
    .map((word) => `${word[0].toUpperCase()}.`)
    .join(" ");
}

// Helper to calculate age from DOB
function calculateAge(dob?: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Emergency basic lookup. Requires a signed-in, verified doctor who confirms the patient
 * cannot consent. Returns only the fields the patient has chosen to expose in an emergency.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { identifier = "", unable_to_consent } = body;
    const trimmedId = String(identifier || "").trim();

    const auth = await requireSignedInDoctor();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const doctorId = auth.user.id;
    const admin = createAdminClient();

    // Rate Limit 1: Max 20 total lookups per hour per doctor
    const hourRate = await checkRateLimit(`er_lookup_total:${doctorId}`, 20, 3600);
    if (!hourRate.success) {
      return NextResponse.json(
        { error: `Hourly rate limit exceeded. Try again in ${hourRate.resetSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Doctor verification
    const { data: docProfile, error: docError } = await admin
      .from("doctor_profiles")
      .select("verified, hospital")
      .eq("user_id", doctorId)
      .maybeSingle();
    if (docError) throw new Error(`Loading doctor profile failed: ${docError.message}`);

    if (!docProfile?.verified) {
      return NextResponse.json(
        { error: "Doctor verification required for emergency lookup" },
        { status: 403 }
      );
    }

    const doctorName = auth.user.profile.full_name || "Doctor";
    const hospitalName = docProfile.hospital || "Hospital not specified";

    // Consent Check
    if (unable_to_consent !== true) {
      return NextResponse.json(
        { error: "You must confirm the patient is unable to consent for emergency lookup" },
        { status: 400 }
      );
    }

    if (!trimmedId) {
      return NextResponse.json(
        { error: "Please enter a valid Health ID or Phone Number" },
        { status: 400 }
      );
    }

    // Lookup patient by health ID, then by phone. Separate exact matches keep user input
    // out of PostgREST filter syntax.
    let patientProfile: Record<string, any> | null = null;
    const byHealthId = await admin
      .from("profiles")
      .select("*")
      .eq("role", "patient")
      .eq("health_id", trimmedId)
      .maybeSingle();
    patientProfile = byHealthId.data;
    if (!patientProfile) {
      const byPhone = await admin
        .from("profiles")
        .select("*")
        .eq("role", "patient")
        .eq("phone", trimmedId)
        .maybeSingle();
      patientProfile = byPhone.data;
    }

    // MISSING ACCOUNT or EMERGENCY DISABLED -> return SAME generic message
    if (!patientProfile || patientProfile.emergency_enabled === false) {
      // Record failure rate limit (3 failures per 10 mins)
      const failRate = await checkRateLimit(`er_lookup_fail:${doctorId}`, 3, 600);
      if (!failRate.success) {
        return NextResponse.json(
          { error: `Too many failed lookups. Rate limit hit. Try again in ${failRate.resetSeconds} seconds.` },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "No emergency record available" }, { status: 404 });
    }

    const patientId: string = patientProfile.id;

    // Build emergency basic payload
    const emergencyFields: string[] = patientProfile.emergency_fields || [
      "blood_group",
      "allergies",
      "conditions",
      "medications",
    ];

    const maskedIdentity = {
      initials: maskName(patientProfile.full_name),
      age: calculateAge(patientProfile.dob),
      sex: patientProfile.sex ?? null,
      health_id: patientProfile.health_id,
      patient_id: patientId,
    };

    // Construct scoped basic info with sources hidden
    const record: Record<string, any> = {
      patient: maskedIdentity,
      includeSources: false,
    };

    if (emergencyFields.includes("blood_group")) {
      record.blood_group = patientProfile.blood_group ?? null;
    }

    if (emergencyFields.includes("allergies")) {
      const { data, error } = await admin
        .from("allergies")
        .select("substance, reaction")
        .eq("patient_id", patientId)
        .eq("confirmed", true);
      if (error) throw new Error(`Loading allergies failed: ${error.message}`);
      record.allergies = (data ?? []).map((a) => ({ substance: a.substance, reaction: a.reaction }));
    }

    if (emergencyFields.includes("conditions")) {
      const { data, error } = await admin
        .from("diagnoses")
        .select("name_canonical, name_as_written, diagnosed_date")
        .eq("patient_id", patientId)
        .eq("confirmed", true)
        .eq("status", "active");
      if (error) throw new Error(`Loading conditions failed: ${error.message}`);
      record.conditions = (data ?? []).map((d) => ({
        name: d.name_canonical || d.name_as_written,
        first_recorded: d.diagnosed_date,
      }));
    }

    if (emergencyFields.includes("medications")) {
      const { data, error } = await admin
        .from("medications")
        .select("name_as_written, strength, dose, frequency")
        .eq("patient_id", patientId)
        .eq("confirmed", true)
        .eq("patient_marked_stopped", false);
      if (error) throw new Error(`Loading medications failed: ${error.message}`);
      record.medications = (data ?? []).map((m) => ({
        name: m.name_as_written,
        strength: m.strength,
        dose: m.dose,
        frequency: m.frequency,
      }));
    }

    // Log Access Event
    await logAccess({
      patient_id: patientId,
      actor_type: "doctor",
      actor_id: doctorId,
      action: "emergency_lookup",
      detail: {
        doctor_name: doctorName,
        hospital: hospitalName,
        unable_to_consent: true,
      },
    });

    // Notify patient and trusted contacts
    const nowStr = new Date().toLocaleString();
    const alertSubject = `🚨 EMERGENCY ACCESS ALERT: Medical record lookup by ${doctorName}`;
    const alertBody = `Doctor ${doctorName} from ${hospitalName} performed an Emergency Basic Lookup on your MediCare record at ${nowStr}.\n\nIf you did not authorize this or suspect misuse, please review your Access Log immediately in MediCare.`;

    const { data: contacts, error: contactsError } = await admin
      .from("trusted_contacts")
      .select("email")
      .eq("patient_id", patientId);
    if (contactsError) throw new Error(`Loading trusted contacts failed: ${contactsError.message}`);

    const emailRecipients = new Set<string>();
    if (patientProfile.phone) {
      // Patient address used for in-app notifications
      emailRecipients.add(`patient-${patientProfile.health_id}@medicare.demo`);
    }
    for (const c of contacts ?? []) {
      if (c.email) emailRecipients.add(c.email);
    }

    for (const email of Array.from(emailRecipients)) {
      await sendEmail({
        to: email,
        subject: alertSubject,
        body: alertBody,
        link: "/access-log",
      });
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (err) {
    return errorResponse(err, "Failed to perform emergency lookup");
  }
}
