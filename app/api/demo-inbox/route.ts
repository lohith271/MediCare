import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { memoryInbox } from "@/lib/email/adapter";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: dbMessages, error } = await supabase
      .from("inbox")
      .select("*")
      .order("created_at", { ascending: false });

    let messages = dbMessages || [];

    if (!messages || messages.length === 0) {
      messages = memoryInbox;
    }

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      messages: memoryInbox,
    });
  }
}
