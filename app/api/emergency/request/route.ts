import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/adapter";
import { logAccess } from "@/lib/access/log";
import { errorResponse, requireSignedInDoctor } from "@/lib/access/patient-access";
import crypto from "crypto";

/**
 * A verified, signed-in doctor asks for full emergency access to a patient.
 * Approval links go to the patient and trusted contacts; the doctor gets nothing until one approves.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      patient_id,
      reason = "Emergency medical access requested for urgent care",
    } = body;

    if (!patient_id || typeof patient_id !== "string") {
      return NextResponse.json(
        { error: "Patient ID is required to request full access" },
        { status: 400 }
      );
    }

    const auth = await requireSignedInDoctor();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const doctorId = auth.user.id;
    const admin = createAdminClient();

    // Verify doctor status
    const { data: docProfile, error: docError } = await admin
      .from("doctor_profiles")
      .select("verified, hospital")
      .eq("user_id", doctorId)
      .maybeSingle();
    if (docError) throw new Error(`Loading doctor profile failed: ${docError.message}`);

    if (!docProfile?.verified) {
      return NextResponse.json(
        { error: "Doctor verification required to request full access" },
        { status: 403 }
      );
    }

    const doctorName = auth.user.profile.full_name || "Doctor";
    const hospitalName = docProfile.hospital || "Hospital not specified";

    // Get patient profile
    const { data: patientProfile, error: patientError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", patient_id)
      .eq("role", "patient")
      .maybeSingle();
    if (patientError) throw new Error(`Loading patient profile failed: ${patientError.message}`);

    if (!patientProfile) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    // Get patient's trusted contacts
    const { data: contacts, error: contactsError } = await admin
      .from("trusted_contacts")
      .select("*")
      .eq("patient_id", patient_id);
    if (contactsError) throw new Error(`Loading trusted contacts failed: ${contactsError.message}`);

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

    const { data: requestData, error: reqDbErr } = await admin
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
    if (reqDbErr || !requestData) {
      throw new Error(`Saving emergency request failed: ${reqDbErr?.message ?? "unknown error"}`);
    }
    const requestId: string = requestData.id;

    // Host for approval links
    const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:3000";

    // Recipients list: trusted contacts + patient address
    const recipients: Array<{ email: string; name: string; contact_id?: string }> = [];
    contacts.forEach((c) => {
      if (c.email) recipients.push({ email: c.email, name: c.name, contact_id: c.id });
    });
    recipients.push({
      email: `patient-${patientProfile.health_id}@medicare.demo`,
      name: patientProfile.full_name,
    });

    // Create single-use tokens & send approval emails
    for (const recipient of recipients) {
      const rawToken = crypto.randomBytes(24).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const { error: tokenError } = await admin.from("approval_tokens").insert({
        request_id: requestId,
        contact_id: recipient.contact_id || null,
        token_hash: tokenHash,
        expires_at: requestExpiresAt,
      });
      if (tokenError) throw new Error(`Creating approval token failed: ${tokenError.message}`);

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
  } catch (err) {
    return errorResponse(err, "Failed to submit emergency access request");
  }
}
