import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { createShareSessionToken } from "@/lib/access/session";
import { logAccess } from "@/lib/access/log";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const body = await req.json().catch(() => ({}));
    const rawCode = (body.code || "").trim().toUpperCase();

    if (!rawCode || rawCode.length !== 8) {
      return NextResponse.json(
        { error: "Please enter a valid 8-character share code" },
        { status: 400 }
      );
    }

    // Hash the code
    const code_hash = crypto.createHash("sha256").update(rawCode).digest("hex");

    const supabase = await createClient();
    const { data: share, error } = await supabase
      .from("shares")
      .select("*")
      .eq("code_hash", code_hash)
      .single();

    if (error || !share) {
      // Check rate limit on failure: 5 failures per 15 mins (900 seconds)
      const rateCheck = await checkRateLimit(`share_verify:${ip}`, 5, 900);
      if (!rateCheck.success) {
        return NextResponse.json(
          {
            error: `Too many failed attempts. Rate limit exceeded. Try again in ${rateCheck.resetSeconds} seconds.`,
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Invalid or expired share code" },
        { status: 400 }
      );
    }

    // Check revoked
    if (share.revoked_at) {
      return NextResponse.json(
        { error: "Share code has been revoked by the patient" },
        { status: 400 }
      );
    }

    // Check expiry
    const now = new Date();
    if (new Date(share.expires_at) <= now) {
      return NextResponse.json(
        { error: "Share code has expired" },
        { status: 400 }
      );
    }

    // Check max uses
    if (share.use_count >= share.max_uses) {
      return NextResponse.json(
        { error: "Maximum use limit reached for this share code" },
        { status: 400 }
      );
    }

    // Increment use_count
    await supabase
      .from("shares")
      .update({ use_count: share.use_count + 1 })
      .eq("id", share.id);

    // Create signed session token
    const token = await createShareSessionToken({
      share_id: share.id,
      patient_id: share.patient_id,
      scope: share.scope,
    });

    // Fetch patient profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, dob, sex, blood_group, health_id")
      .eq("id", share.patient_id)
      .single();

    // Log access
    await logAccess({
      patient_id: share.patient_id,
      actor_type: "share_code",
      actor_id: share.id,
      action: "share_accessed",
      detail: {
        share_id: share.id,
        scope: share.scope,
        uses_remaining: share.max_uses - (share.use_count + 1),
      },
      ip,
    });

    return NextResponse.json({
      success: true,
      token,
      patient_id: share.patient_id,
      scope: share.scope,
      expires_at: share.expires_at,
      uses_remaining: share.max_uses - (share.use_count + 1),
      profile: profile || {
        id: share.patient_id,
        full_name: "Patient Record",
        health_id: "MED123456789",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to verify share code" },
      { status: 500 }
    );
  }
}
