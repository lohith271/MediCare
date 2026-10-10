import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "node:crypto";
import { doctorRegisterSchema, patientRegisterSchema } from "@/lib/types/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/access/patient-access";

export const runtime = "nodejs";

const HEALTH_ID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_SECONDS = 3600;

function generateHealthId(): string {
  return Array.from({ length: 12 }, () =>
    HEALTH_ID_ALPHABET[randomInt(HEALTH_ID_ALPHABET.length)]
  ).join("");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || (body.role !== "patient" && body.role !== "doctor")) {
      return NextResponse.json({ error: "Choose Patient or Doctor and complete the form." }, { status: 400 });
    }

    const parsed = body.role === "patient"
      ? patientRegisterSchema.safeParse(body)
      : doctorRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Please check the registration details." },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const roleMetadata = "dob" in input
      ? { dob: input.dob, sex: input.sex, blood_group: input.blood_group }
      : { license_no: input.license_no, hospital: input.hospital };
    const healthId = generateHealthId();
    const supabase = createAdminClient();

    // Rate limit per network, stored in the database so it holds across instances.
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",").at(-1)?.trim() || request.headers.get("x-real-ip") || "unknown";
    const ipHash = createHash("sha256").update(clientIp).digest("hex");
    const { data: withinLimit, error: rateLimitError } = await supabase.rpc("consume_signup_rate_limit", {
      p_key: `signup:${ipHash}`,
      p_limit: SIGNUP_LIMIT,
      p_window_seconds: SIGNUP_WINDOW_SECONDS,
    });
    if (rateLimitError) {
      // Fail closed: without the limiter we do not create accounts.
      console.error("[register] signup rate limiter unavailable:", rateLimitError.message);
      return NextResponse.json(
        { error: "Registration is temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
    if (!withinLimit) {
      return NextResponse.json(
        { error: "Too many registration attempts from this network. Try again in about an hour." },
        { status: 429 }
      );
    }

    // The database trigger creates the profile row from user_metadata.
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        role: body.role,
        full_name: input.full_name,
        phone: input.phone,
        health_id: healthId,
        ...roleMetadata,
      },
    });

    if (error || !data.user) {
      const message = error?.message || "Could not create the account.";
      const isDuplicate = /already registered|already exists|unique/i.test(message);
      return NextResponse.json(
        { error: isDuplicate ? "An account with this email or phone already exists. Sign in or use different details." : "Account creation failed. Check the Supabase profile/signup migration and try again." },
        { status: isDuplicate ? 409 : 400 }
      );
    }

    return NextResponse.json(
      { success: true, user_id: data.user.id, health_id: healthId },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err, "Registration failed");
  }
}
