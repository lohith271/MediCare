import { NextResponse } from "next/server";
import { getSessionUser, SupabaseNotConfiguredError } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns the signed-in user's session, or 401 when nobody is logged in. */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in", session: null }, { status: 401 });
    }
    return NextResponse.json({
      session: {
        user: { id: user.id, email: user.email, role: user.role },
        profile: user.profile,
      },
    });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message, session: null }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not load session", session: null }, { status: 500 });
  }
}
