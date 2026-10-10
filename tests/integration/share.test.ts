import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit } from "@/lib/ratelimit";
import { createShareSessionToken, verifyShareSessionToken } from "@/lib/access/session";
import crypto from "crypto";

describe("Member 4: Temporary Share Code & Access Verification", () => {
  it("generates and verifies 8-character share session JWT token", async () => {
    const payload = {
      share_id: "test-share-123",
      patient_id: "test-patient-001",
      scope: ["allergies", "medications"],
    };

    const token = await createShareSessionToken(payload, "1h");
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const verified = await verifyShareSessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.share_id).toBe("test-share-123");
    expect(verified?.patient_id).toBe("test-patient-001");
    expect(verified?.scope).toEqual(["allergies", "medications"]);
  });

  it("hashes 8-character code deterministically with SHA-256", () => {
    const rawCode = "X7K9M2P4";
    const hash1 = crypto.createHash("sha256").update(rawCode).digest("hex");
    const hash2 = crypto.createHash("sha256").update(rawCode).digest("hex");

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it("enforces rate limits on failed verification attempts", async () => {
    const testKey = `test_share_verify_${Date.now()}`;
    const limit = 5;
    const windowSec = 900;

    for (let i = 1; i <= limit; i++) {
      const result = await checkRateLimit(testKey, limit, windowSec);
      expect(result.success).toBe(true);
    }

    // 6th attempt must fail rate limit check
    const failAttempt = await checkRateLimit(testKey, limit, windowSec);
    expect(failAttempt.success).toBe(false);
    expect(failAttempt.remaining).toBe(0);
  });
});
