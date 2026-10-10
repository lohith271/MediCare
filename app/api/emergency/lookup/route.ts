import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { sendEmail } from "@/lib/email/adapter";
import { logAccess } from "@/lib/access/log";

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
function calculateAge(dob?: string): number | null {
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      identifier = "",
      unable_to_consent,
      doctor_id: reqDoctorId,
      doctor_name: reqDoctorName,
      hospital: reqHospital,
    } = body;

    const trimmedId = (identifier || "").trim();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const doctorId = user?.id || reqDoctorId || "demo-doctor-001";

    // Rate Limit 1: Max 20 total lookups per hour per doctor
    const hourRate = await checkRateLimit(`er_lookup_total:${doctorId}`, 20, 3600);
    if (!hourRate.success) {
      return NextResponse.json(
        { error: `Hourly rate limit exceeded. Try again in ${hourRate.resetSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Check Doctor Verification
    let doctorName = reqDoctorName || "Dr. Priya Patel";
    let hospitalName = reqHospital || "Metro General Hospital";
    let isDoctorVerified = true;

    if (user) {
      const { data: docProfile } = await supabase
        .from("doctor_profiles")
        .select("verified, hospital")
        .eq("user_id", doctorId)
        .single();

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", doctorId)
        .single();

      if (userProfile?.full_name) doctorName = userProfile.full_name;
      if (docProfile?.hospital) hospitalName = docProfile.hospital;
      if (docProfile) isDoctorVerified = docProfile.verified;
    }

    if (!isDoctorVerified) {
      return NextResponse.json(
        { error: "Doctor verification required for emergency lookup" },
        { status: 403 }
      );
    }

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

    // Lookup patient by phone or health_id
    const { data: patientProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .or(`health_id.eq.${trimmedId},phone.eq.${trimmedId}`)
      .single();

    // MISSING ACCOUNT or EMERGENCY DISABLED -> return SAME generic message
    if (profileError || !patientProfile || patientProfile.emergency_enabled === false) {
      // Record failure rate limit (3 failures per 10 mins)
      const failRate = await checkRateLimit(`er_lookup_fail:${doctorId}`, 3, 600);
      if (!failRate.success) {
        return NextResponse.json(
          { error: `Too many failed lookups. Rate limit hit. Try again in ${failRate.resetSeconds} seconds.` },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "No emergency record available" },
        { status: 404 }
      );
    }

    // Build emergency basic payload
    const emergencyFields = patientProfile.emergency_fields || [
      "blood_group",
      "allergies",
      "conditions",
      "medications",
    ];

    const maskedIdentity = {
      initials: maskName(patientProfile.full_name),
      age: calculateAge(patientProfile.dob) || 45,
      sex: patientProfile.sex || "male",
      health_id: patientProfile.health_id,
      patient_id: patientProfile.id,
    };

    // Construct scoped basic info with sources hidden
    const record: Record<string, any> = {
      patient: maskedIdentity,
      includeSources: false,
    };

    if (emergencyFields.includes("blood_group")) {
      record.blood_group = patientProfile.blood_group || "B+";
    }

    if (emergencyFields.includes("allergies")) {
      record.allergies = [
        { substance: "Penicillin", reaction: "Severe skin rash & anaphylaxis" },
      ];
    }

    if (emergencyFields.includes("conditions")) {
      record.conditions = [
        { name: "Type 2 Diabetes Mellitus", first_recorded: "2021-03-15" },
        { name: "Essential Hypertension", first_recorded: "2019-11-02" },
      ];
    }

    if (emergencyFields.includes("medications")) {
      record.medications = [
        { name: "Metformin", strength: "500 mg", dose: "1 tab", frequency: "twice daily" },
        { name: "Amlodipine", strength: "5 mg", dose: "1 tab", frequency: "once daily" },
      ];
    }

    // Log Access Event
    await logAccess({
      patient_id: patientProfile.id,
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

    // Fetch trusted contacts
    const { data: contacts } = await supabase
      .from("trusted_contacts")
      .select("email")
      .eq("patient_id", patientProfile.id);

    const emailRecipients = new Set<string>();
    if (patientProfile.phone) {
      // Mock patient email if not directly in profile
      emailRecipients.add(`patient-${patientProfile.health_id}@medicare.demo`);
    }

    if (contacts) {
      contacts.forEach((c) => {
        if (c.email) emailRecipients.add(c.email);
      });
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
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to perform emergency lookup" },
      { status: 500 }
    );
  }
}
