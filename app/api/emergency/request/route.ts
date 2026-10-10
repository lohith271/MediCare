import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/adapter";
import { logAccess } from "@/lib/access/log";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      patient_id,
      reason = "Emergency medical access requested for urgent care",
      doctor_id: reqDoctorId,
      doctor_name: reqDoctorName,
      hospital: reqHospital,
    } = body;

    if (!patient_id) {
      return NextResponse.json(
        { error: "Patient ID is required to request full access" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const doctorId = user?.id || reqDoctorId || "demo-doctor-001";
    let doctorName = reqDoctorName || "Dr. Priya Patel";
    let hospitalName = reqHospital || "Metro General Hospital";

    // Verify doctor status
    if (user) {
      const { data: docProfile } = await supabase
        .from("doctor_profiles")
        .select("verified, hospital")
        .eq("user_id", doctorId)
        .single();

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", doctorId)
        .single();

      if (userProfile?.full_name) doctorName = userProfile.full_name;
      if (docProfile?.hospital) hospitalName = docProfile.hospital;

      if (docProfile && !docProfile.verified) {
        return NextResponse.json(
          { error: "Doctor verification required to request full access" },
          { status: 403 }
        );
      }
    }

    // Get patient profile
    const { data: patientProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", patient_id)
      .single();

    if (!patientProfile) {
      return NextResponse.json(
        { error: "Patient profile not found" },
        { status: 404 }
      );
    }

    // Get patient's trusted contacts
    const { data: contacts } = await supabase
      .from("trusted_contacts")
      .select("*")
      .eq("patient_id", patient_id);

    if (!contacts || contacts.length === 0) {
      return NextResponse.json(
        {
          error:
            "Patient has no trusted contacts configured. Out-of-band full access request requires at least one trusted contact.",
        },
        { status: 400 }
      );
    }

    // Expiry: 60 minutes from now
    const now = new Date();
    const requestExpiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    // Insert into emergency_requests
    const { data: requestData, error: reqDbErr } = await supabase
      .from("emergency_requests")
      .insert({
        doctor_id: doctorId,
        patient_id,
        reason,
        status: "pending",
        request_expires_at: requestExpiresAt,
      })
      .select("id")
      .single();

    const requestId = requestData?.id || `req-${Date.now()}`;

    // Get host for approval links
    const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:3000";

    // Recipients list: patient email + trusted contacts
    const recipients: Array<{ email: string; name: string; contact_id?: string }> = [];

    // Add trusted contacts
    contacts.forEach((c) => {
      if (c.email) recipients.push({ email: c.email, name: c.name, contact_id: c.id });
    });

    // Add patient email if available
    recipients.push({
      email: `patient-${patientProfile.health_id}@medicare.demo`,
      name: patientProfile.full_name,
    });

    // Create single-use tokens & send approval emails
    for (const recipient of recipients) {
      const rawToken = crypto.randomBytes(24).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      await supabase.from("approval_tokens").insert({
        request_id: requestId,
        contact_id: recipient.contact_id || null,
        token_hash: tokenHash,
        expires_at: requestExpiresAt,
      });

      const approvalUrl = `${origin}/emergency/approve?token=${rawToken}`;
      const emailSubject = `URGENT: Emergency Full Access Request for ${patientProfile.full_name}`;
      const emailBody = `Doctor ${doctorName} from ${hospitalName} has requested FULL emergency access to ${patientProfile.full_name}'s medical records.\n\nReason: ${reason}\n\nThis approval request expires in 60 minutes. Please click below to Accept or Decline access.`;

      await sendEmail({
        to: recipient.email,
        subject: emailSubject,
        body: emailBody,
        link: approvalUrl,
      });
    }

    // Log access event
    await logAccess({
      patient_id,
      actor_type: "doctor",
      actor_id: doctorId,
      action: "emergency_full_access_requested",
      detail: {
        request_id: requestId,
        reason,
        doctor_name: doctorName,
        hospital: hospitalName,
        contacts_notified: recipients.length,
      },
    });

    return NextResponse.json({
      success: true,
      request_id: requestId,
      status: "pending",
      expires_at: requestExpiresAt,
      message: `Emergency access request sent to ${recipients.length} trusted recipient(s).`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit emergency access request" },
      { status: 500 }
    );
  }
}
