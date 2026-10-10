import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomInt } from "node:crypto";
import { doctorRegisterSchema, patientRegisterSchema } from "@/lib/types/auth";

export const runtime = "nodejs";

const HEALTH_ID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const fallbackLimits = new Map<string, { count: number; windowStart: number }>();
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

function generateHealthId(): string {
  return Array.from({ length: 12 }, () =>
    HEALTH_ID_ALPHABET[randomInt(HEALTH_ID_ALPHABET.length)]
  ).join("");
}

function withinFallbackLimit(key: string): boolean {
  const now = Date.now();
  const entry = fallbackLimits.get(key);
  if (!entry || now - entry.windowStart >= SIGNUP_WINDOW_MS) {
    fallbackLimits.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= SIGNUP_LIMIT) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server account creation is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 }
    );
  }

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
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",").at(-1)?.trim() || request.headers.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256").update(clientIp).digest("hex");
  const { data: withinLimit, error: rateLimitError } = await supabase.rpc("consume_signup_rate_limit", {
    p_key: `signup:${ipHash}`,
    p_limit: 5,
    p_window_seconds: 3600,
  });

  // Keep registration available if the optional database limiter migration is
  // missing; use a process-local fallback in that case.
  const isAllowed = rateLimitError
    ? withinFallbackLimit(`signup:${ipHash}`)
    : Boolean(withinLimit);
  if (!isAllowed) {
    return NextResponse.json(
      { error: "Too many registration attempts from this network. Try again in about an hour." },
      { status: 429 }
    );
  }

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
}
