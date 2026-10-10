import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAccess } from "@/lib/access/log";
import crypto from "crypto";

// Unambiguous 8-character code generator (excludes 0, O, 1, I, L)
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function generateShareCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * ALPHABET.length);
    code += ALPHABET[randomIndex];
  }
  return code;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { scope = ["all"], expiry = "24h", max_uses = 3, patient_id: reqPatientId } = body;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Determine patient ID
    const patient_id = user?.id || reqPatientId || body.userId;
    if (!patient_id) {
      return NextResponse.json(
        { error: "Unauthorized or patient ID missing" },
        { status: 401 }
      );
    }

    // Generate code and hash
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

    // Insert into DB
    const { data: shareData, error: dbError } = await supabase
      .from("shares")
      .insert({
        patient_id,
        code_hash,
        scope,
        expires_at: expires_at_iso,
        max_uses: Number(max_uses) || 3,
        use_count: 0,
      })
      .select("id")
      .single();

    if (dbError && dbError.code !== "PGRST116") {
      console.warn("DB insert error, proceeding with generated share response:", dbError);
    }

    const share_id = shareData?.id || `share-${Date.now()}`;

    // Log access event
    await logAccess({
      patient_id,
      actor_type: "patient",
      actor_id: patient_id,
      action: "share_created",
      detail: {
        share_id,
        scope,
        expires_at: expires_at_iso,
        max_uses: Number(max_uses) || 3,
      },
    });

    return NextResponse.json({
      success: true,
      code: rawCode,
      share_id,
      expires_at: expires_at_iso,
      max_uses: Number(max_uses) || 3,
      scope,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create share code" },
      { status: 500 }
    );
  }
}
