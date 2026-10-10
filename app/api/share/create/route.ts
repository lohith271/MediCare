import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logAccess } from "@/lib/access/log";
import { errorResponse, requireSignedInPatient } from "@/lib/access/patient-access";
import crypto from "crypto";

// Unambiguous 8-character code generator (excludes 0, O, 1, I, L)
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const ALLOWED_SCOPES = ["all", "allergies", "medications", "conditions", "lab_results"];

function generateShareCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    const randomIndex = crypto.randomInt(ALPHABET.length);
    code += ALPHABET[randomIndex];
  }
  return code;
}

export async function POST(req: Request) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const patient_id = auth.user.id;

    const body = await req.json().catch(() => ({}));
    const { expiry = "24h", max_uses = 3 } = body;
    const scope: unknown = body.scope ?? ["all"];

    if (
      !Array.isArray(scope) ||
      scope.length === 0 ||
      !scope.every((s) => typeof s === "string" && ALLOWED_SCOPES.includes(s))
    ) {
      return NextResponse.json(
        { error: `Scope must be one or more of: ${ALLOWED_SCOPES.join(", ")}` },
        { status: 400 }
      );
    }

    const rawCode = generateShareCode();
    const code_hash = crypto.createHash("sha256").update(rawCode).digest("hex");

    // Calculate expiry date
    const now = new Date();
    let expiresAt: Date;
    if (expiry === "1h") {
      expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (expiry === "24h") {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (expiry === "7d") {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      const parsed = new Date(expiry);
      expiresAt = isNaN(parsed.getTime())
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
        : parsed;
    }

    const expires_at_iso = expiresAt.toISOString();
    const uses = Number(max_uses) || 3;

    const { data: shareData, error: dbError } = await createAdminClient()
      .from("shares")
      .insert({
        patient_id,
        code_hash,
        scope,
        expires_at: expires_at_iso,
        max_uses: uses,
        use_count: 0,
      })
      .select("id")
      .single();
    if (dbError || !shareData) {
      throw new Error(`Creating share code failed: ${dbError?.message ?? "unknown error"}`);
    }

    const share_id: string = shareData.id;

    await logAccess({
      patient_id,
      actor_type: "patient",
      actor_id: patient_id,
      action: "share_created",
      detail: {
        share_id,
        scope,
        expires_at: expires_at_iso,
        max_uses: uses,
      },
    });

    return NextResponse.json({
      success: true,
      code: rawCode,
      share_id,
      expires_at: expires_at_iso,
      max_uses: uses,
      scope,
    });
  } catch (err) {
    return errorResponse(err, "Failed to create share code");
  }
}
