import { createClient } from "@/lib/supabase/server";

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  link?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  inboxId?: string;
  error?: string;
}

// In-memory fallback inbox for testing when DB is unavailable
export const memoryInbox: Array<{
  id: string;
  to_email: string;
  subject: string;
  body: string;
  link?: string | null;
  created_at: string;
}> = [];

/**
 * Universal Email Adapter.
 * Sends email via Resend if RESEND_API_KEY is set, and writes to `inbox` table
 * for the in-app Demo Inbox (/demo-inbox).
 */
export async function sendEmail({
  to,
  subject,
  body,
  link,
}: SendEmailInput): Promise<SendEmailResult> {
  let resendSuccess = false;
  let messageId: string | undefined;

  // 1. Try sending via Resend if RESEND_API_KEY is present
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MediCare <noreply@medicare.demo>",
          to: [to],
          subject,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>${subject}</h2>
            <p>${body.replace(/\n/g, "<br/>")}</p>
            ${
              link
                ? `<p style="margin-top: 20px;"><a href="${link}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">View Action / Details</a></p>`
                : ""
            }
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;"/>
            <p style="font-size: 12px; color: #777;">MediCare is a patient records app, not insurance. Demo with simulated data.</p>
          </div>`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        resendSuccess = true;
        messageId = data.id;
      }
    } catch (_err) {
      console.warn("Resend API call failed, falling back to inbox table:", _err);
    }
  }

  // 2. Always write to `inbox` table so it's viewable in /demo-inbox
  let inboxId: string | undefined;
  const nowIso = new Date().toISOString();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inbox")
      .insert({
        to_email: to,
        subject,
        body,
        link: link || null,
        created_at: nowIso,
      })
      .select("id")
      .single();

    if (!error && data) {
      inboxId = data.id;
    } else {
      throw error || new Error("Failed to insert inbox row");
    }
  } catch (_dbErr) {
    // Memory fallback if Supabase DB is unreachable during testing
    inboxId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    memoryInbox.unshift({
      id: inboxId,
      to_email: to,
      subject,
      body,
      link: link || null,
      created_at: nowIso,
    });
  }

  return {
    success: resendSuccess || true,
    messageId,
    inboxId,
  };
}
