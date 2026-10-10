import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "medicare-signed-session-secret-key-hackathon-2026"
);

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
    .sign(JWT_SECRET);
}

/**
 * Verifies a Share JWT session token.
 */
export async function verifyShareSessionToken(
  token: string
): Promise<ShareSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
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
    .sign(JWT_SECRET);
}

/**
 * Verifies an Emergency JWT session token.
 */
export async function verifyEmergencySessionToken(
  token: string
): Promise<EmergencySessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "emergency") return null;
    return payload as unknown as EmergencySessionPayload;
  } catch (_err) {
    return null;
  }
}
