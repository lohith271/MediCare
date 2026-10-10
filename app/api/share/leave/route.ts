import { NextResponse } from "next/server";
import { SHARE_COOKIE } from "@/lib/access/session";

export const runtime = "nodejs";

/** Ends the doctor's shared-record session by clearing the share cookie. */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SHARE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
