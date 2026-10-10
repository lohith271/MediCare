import { describe, it, expect } from "vitest";
import { createEmergencySessionToken, verifyEmergencySessionToken } from "@/lib/access/session";
import { checkRateLimit } from "@/lib/ratelimit";
import { sendEmail } from "@/lib/email/adapter";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
const dbReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe("Member 4: Emergency Doctor Lookup & Out-of-band Approval", () => {
  it("creates and verifies emergency session signed token", async () => {
    const payload = {
      request_id: "req-999",
      doctor_id: "doc-001",
      patient_id: "pat-001",
    };

    const token = await createEmergencySessionToken(payload, "24h");
    expect(token).toBeDefined();

    const verified = await verifyEmergencySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.request_id).toBe("req-999");
    expect(verified?.doctor_id).toBe("doc-001");
    expect(verified?.patient_id).toBe("pat-001");
  });

  it.skipIf(!dbReady)("dispatches notification emails to demo inbox", async () => {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const link = "http://localhost:3000/emergency/approve?token=test123token";

    const result = await sendEmail({
      to: "contact@medicare.demo",
      subject: "URGENT: Emergency Access Request",
      body: "Doctor Priya Patel requested full access.",
      link,
    });

    expect(result.success).toBe(true);
    const { data } = await admin
      .from("inbox")
      .select("to_email, link")
      .eq("link", link)
      .limit(1);
    expect(data?.[0]?.to_email).toBe("contact@medicare.demo");
  });

  it.skipIf(!dbReady)("enforces emergency lookup doctor rate limits", async () => {
    const doctorKey = `test_er_lookup_doctor_${Date.now()}`;
    const limit = 3;
    const windowSec = 600;

    for (let i = 1; i <= limit; i++) {
      const res = await checkRateLimit(doctorKey, limit, windowSec);
      expect(res.success).toBe(true);
    }

    const blocked = await checkRateLimit(doctorKey, limit, windowSec);
    expect(blocked.success).toBe(false);
  });
});
