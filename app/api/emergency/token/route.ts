import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEmergencySessionToken } from "@/lib/access/session";
import { logAccess } from "@/lib/access/log";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawToken = searchParams.get("token") || "";

    if (!rawToken) {
      return NextResponse.json(
        { error: "Token query parameter is required" },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const supabase = await createClient();

    const { data: tokenRow, error } = await supabase
      .from("approval_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .single();

    if (error || !tokenRow) {
      return NextResponse.json(
        { error: "Invalid or expired approval token" },
        { status: 404 }
      );
    }

    // Get emergency request details
    const { data: requestRow } = await supabase
      .from("emergency_requests")
      .select("*")
      .eq("id", tokenRow.request_id)
      .single();

    if (!requestRow) {
      return NextResponse.json(
        { error: "Associated emergency request not found" },
        { status: 404 }
      );
    }

    // Get patient profile
    const { data: patientProfile } = await supabase
      .from("profiles")
      .select("full_name, health_id, emergency_access_hours")
      .eq("id", requestRow.patient_id)
      .single();

    // Get doctor info
    const { data: doctorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", requestRow.doctor_id)
      .single();

    const { data: doctorWork } = await supabase
      .from("doctor_profiles")
      .select("hospital")
      .eq("user_id", requestRow.doctor_id)
      .single();

    const now = new Date();
    const isExpired =
      new Date(tokenRow.expires_at) <= now || new Date(requestRow.request_expires_at) <= now;
    const isUsed = tokenRow.used_at !== null || requestRow.status !== "pending";

    if (isUsed || isExpired) {
      return NextResponse.json({
        valid: false,
        already_handled: true,
        status: requestRow.status,
        message: isExpired
          ? "This emergency approval token has expired."
          : "This request has already been handled by a contact or patient.",
        doctor_name: doctorProfile?.full_name || "Dr. Priya Patel",
        hospital: doctorWork?.hospital || "Metro General Hospital",
        patient_name: patientProfile?.full_name || "Patient Record",
      });
    }

    return NextResponse.json({
      valid: true,
      already_handled: false,
      request_id: requestRow.id,
      doctor_name: doctorProfile?.full_name || "Dr. Priya Patel",
      hospital: doctorWork?.hospital || "Metro General Hospital",
      reason: requestRow.reason,
      patient_name: patientProfile?.full_name || "Patient Record",
      access_hours: patientProfile?.emergency_access_hours || 24,
      expires_at: tokenRow.expires_at,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to inspect approval token" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token: rawToken, action } = body;

    if (!rawToken || !action || !["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Token and valid action ('accept' or 'decline') are required" },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const supabase = await createClient();

    // Fetch token
    const { data: tokenRow, error } = await supabase
      .from("approval_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .single();

    if (error || !tokenRow) {
      return NextResponse.json(
        { error: "Invalid or expired approval token" },
        { status: 404 }
      );
    }

    // Fetch associated emergency request
    const { data: requestRow } = await supabase
      .from("emergency_requests")
      .select("*")
      .eq("id", tokenRow.request_id)
      .single();

    if (!requestRow) {
      return NextResponse.json(
        { error: "Associated emergency request not found" },
        { status: 404 }
      );
    }

    // Check if already handled or expired
    const now = new Date();
    const isExpired = new Date(tokenRow.expires_at) <= now;
    if (tokenRow.used_at || requestRow.status !== "pending" || isExpired) {
      return NextResponse.json(
        {
          error:
            "This request has already been handled by another trusted contact or has expired.",
          already_handled: true,
        },
        { status: 400 }
      );
    }

    const nowIso = now.toISOString();

    // Mark token as used
    await supabase
      .from("approval_tokens")
      .update({ used_at: nowIso })
      .eq("id", tokenRow.id);

    if (action === "decline") {
      // Update request to declined
      await supabase
        .from("emergency_requests")
        .update({ status: "declined" })
        .eq("id", requestRow.id);

      await logAccess({
        patient_id: requestRow.patient_id,
        actor_type: "patient",
        actor_id: tokenRow.contact_id || requestRow.patient_id,
        action: "emergency_access_declined",
        detail: {
          request_id: requestRow.id,
          doctor_id: requestRow.doctor_id,
        },
      });

      return NextResponse.json({
        success: true,
        action: "decline",
        message: "Emergency access request was declined.",
      });
    }

    // Action === 'accept'
    // Get patient's emergency_access_hours
    const { data: patientProfile } = await supabase
      .from("profiles")
      .select("emergency_access_hours")
      .eq("id", requestRow.patient_id)
      .single();

    const accessHours = patientProfile?.emergency_access_hours || 24;
    const accessExpiresAt = new Date(now.getTime() + accessHours * 60 * 60 * 1000).toISOString();

    // Update request to approved
    await supabase
      .from("emergency_requests")
      .update({
        status: "approved",
        access_expires_at: accessExpiresAt,
      })
      .eq("id", requestRow.id);

    // Generate signed emergency session token
    const sessionToken = await createEmergencySessionToken(
      {
        request_id: requestRow.id,
        doctor_id: requestRow.doctor_id,
        patient_id: requestRow.patient_id,
      },
      `${accessHours}h`
    );

    await logAccess({
      patient_id: requestRow.patient_id,
      actor_type: "patient",
      actor_id: tokenRow.contact_id || requestRow.patient_id,
      action: "emergency_access_approved",
      detail: {
        request_id: requestRow.id,
        doctor_id: requestRow.doctor_id,
        access_expires_at: accessExpiresAt,
        access_hours: accessHours,
      },
    });

    return NextResponse.json({
      success: true,
      action: "accept",
      access_expires_at: accessExpiresAt,
      session_token: sessionToken,
      patient_id: requestRow.patient_id,
      message: `Emergency access granted for ${accessHours} hours.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process approval action" },
      { status: 500 }
    );
  }
}
