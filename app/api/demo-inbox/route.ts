import { NextResponse } from "next/server";
import { createAdminClient, getSessionUser } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/access/patient-access";

export const dynamic = "force-dynamic";

/**
 * In-app mailbox. Approval emails carry live approval links, so a message is shown
 * only to the signed-in patient it was addressed to: their own account email, their
 * health-id address, or one of their trusted contacts. Doctors see nothing here.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }

    const admin = createAdminClient();
    const recipients = new Set<string>();
    if (user.email) recipients.add(user.email);

    if (user.role === "patient") {
      recipients.add(`patient-${user.profile.health_id}@medicare.demo`);
      const { data: contacts, error: contactsError } = await admin
        .from("trusted_contacts")
        .select("email")
        .eq("patient_id", user.id);
      if (contactsError) throw new Error(`Loading contacts failed: ${contactsError.message}`);
      for (const c of contacts ?? []) {
        if (c.email) recipients.add(String(c.email));
      }
    }

    if (recipients.size === 0) {
      return NextResponse.json({ success: true, messages: [] });
    }

    const { data: messages, error } = await admin
      .from("inbox")
      .select("*")
      .in("to_email", Array.from(recipients))
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Loading inbox failed: ${error.message}`);

    return NextResponse.json({ success: true, messages: messages ?? [] });
  } catch (err) {
    return errorResponse(err, "Failed to load inbox");
  }
}
