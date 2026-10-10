import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { memoryAccessLogs } from "@/lib/access/log";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reqPatientId = searchParams.get("patient_id");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const patient_id = user?.id || reqPatientId || "demo-patient-001";

    // Query access_log table
    const { data: dbLogs, error } = await supabase
      .from("access_log")
      .select("*")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false });

    let logs = dbLogs || [];

    // Include memory logs if DB returned empty or errored
    if (!logs || logs.length === 0) {
      const filteredMemory = memoryAccessLogs.filter(
        (l) => l.patient_id === patient_id || patient_id === "demo-patient-001"
      );
      logs = [...logs, ...filteredMemory];
    }

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch access log" },
      { status: 500 }
    );
  }
}
