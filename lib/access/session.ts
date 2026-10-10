import { SignJWT, jwtVerify } from "jose";

export interface ShareSessionPayload {
  type: "share";
  share_id: string;
  patient_id: string;
  scope: string[];
  [key: string]: unknown;
}

export interface EmergencySessionPayload {
  type: "emergency";
  request_id: string;
  doctor_id: string;
  patient_id: string;
  [key: string]: unknown;
}

/**
 * Signing key for share and emergency tokens. There is deliberately no fallback:
 * a public default secret would let anyone forge doctor access.
 */
function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Add a long random value to the server environment before using share or emergency access."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Creates a signed JWT session token for a doctor accessing via a Share Code.
 */
export async function createShareSessionToken(
  payload: { share_id: string; patient_id: string; scope: string[] },
  expiresIn: string = "24h"
): Promise<string> {
  return await new SignJWT({
    type: "share",
    share_id: payload.share_id,
    patient_id: payload.patient_id,
    scope: payload.scope,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSessionSecret());
}

/**
 * Verifies a Share JWT session token. Returns null for invalid or expired tokens.
 */
export async function verifyShareSessionToken(
  token: string
): Promise<ShareSessionPayload | null> {
  const secret = getSessionSecret();
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "share") return null;
    return payload as unknown as ShareSessionPayload;
  } catch (_err) {
    return null;
  }
}

/**
 * Creates a signed JWT session token for an Emergency Full Access session.
 */
export async function createEmergencySessionToken(
  payload: { request_id: string; doctor_id: string; patient_id: string },
  expiresIn: string = "24h"
): Promise<string> {
  return await new SignJWT({
    type: "emergency",
    request_id: payload.request_id,
    doctor_id: payload.doctor_id,
    patient_id: payload.patient_id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSessionSecret());
}

/**
 * Verifies an Emergency JWT session token. Returns null for invalid or expired tokens.
 */
export async function verifyEmergencySessionToken(
  token: string
): Promise<EmergencySessionPayload | null> {
  const secret = getSessionSecret();
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "emergency") return null;
    return payload as unknown as EmergencySessionPayload;
  } catch (_err) {
    return null;
  }
}

/** Cookie that holds the doctor's share-session token after a successful code entry. */
export const SHARE_COOKIE = "medicare_share";
