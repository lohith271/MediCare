import { describe, it, expect } from "vitest";
import { createEmergencySessionToken, verifyEmergencySessionToken } from "@/lib/access/session";
import { checkRateLimit } from "@/lib/ratelimit";
import { sendEmail, memoryInbox } from "@/lib/email/adapter";
import crypto from "crypto";

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

  it("dispatches notification emails to demo inbox", async () => {
    const initialCount = memoryInbox.length;

    const result = await sendEmail({
      to: "contact@medicare.demo",
      subject: "URGENT: Emergency Access Request",
      body: "Doctor Priya Patel requested full access.",
      link: "http://localhost:3000/emergency/approve?token=test123token",
    });

    expect(result.success).toBe(true);
    expect(memoryInbox.length).toBeGreaterThan(initialCount);
    expect(memoryInbox[0].to_email).toBe("contact@medicare.demo");
    expect(memoryInbox[0].link).toContain("token=test123token");
  });

  it("enforces emergency lookup doctor rate limits", async () => {
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
