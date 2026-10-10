import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { createShareSessionToken, SHARE_COOKIE } from "@/lib/access/session";
import { logAccess } from "@/lib/access/log";
import { errorResponse } from "@/lib/access/patient-access";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const body = await req.json().catch(() => ({}));
    const rawCode = String(body.code || "").trim().toUpperCase();

    if (!rawCode || rawCode.length !== 8) {
      return NextResponse.json(
        { error: "Please enter a valid 8-character share code" },
        { status: 400 }
      );
    }

    // Hash the code. The shares table is not readable by anonymous callers under RLS,
    // so the lookup uses the service-role client. The code hash is the credential.
    const code_hash = crypto.createHash("sha256").update(rawCode).digest("hex");
    const admin = createAdminClient();

    const { data: share, error } = await admin
      .from("shares")
      .select("*")
      .eq("code_hash", code_hash)
      .maybeSingle();
    if (error) throw new Error(`Loading share failed: ${error.message}`);

    if (!share) {
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

    if (share.revoked_at) {
      return NextResponse.json(
        { error: "Share code has been revoked by the patient" },
        { status: 400 }
      );
    }

    if (new Date(share.expires_at) <= new Date()) {
      return NextResponse.json(
        { error: "Share code has expired" },
        { status: 400 }
      );
    }

    if (share.use_count >= share.max_uses) {
      return NextResponse.json(
        { error: "Maximum use limit reached for this share code" },
        { status: 400 }
      );
    }

    const { error: useError } = await admin
      .from("shares")
      .update({ use_count: share.use_count + 1 })
      .eq("id", share.id);
    if (useError) throw new Error(`Recording share use failed: ${useError.message}`);

    const token = await createShareSessionToken({
      share_id: share.id,
      patient_id: share.patient_id,
      scope: share.scope,
    });

    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name, dob, sex, blood_group, health_id")
      .eq("id", share.patient_id)
      .maybeSingle();

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

    const response = NextResponse.json({
      success: true,
      token,
      patient_id: share.patient_id,
      scope: share.scope,
      expires_at: share.expires_at,
      uses_remaining: share.max_uses - (share.use_count + 1),
      profile: profile || {
        id: share.patient_id,
        full_name: "Patient Record",
        health_id: null,
      },
    });
    response.cookies.set(SHARE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(share.expires_at),
    });
    return response;
  } catch (err) {
    return errorResponse(err, "Failed to verify share code");
  }
}
