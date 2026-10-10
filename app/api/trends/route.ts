import { NextRequest, NextResponse } from "next/server";
import { getLabResults, addLabResult } from "@/lib/data/store";
import { LabResultFlag } from "@/lib/types/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patient_id") || "demo-patient-001";

    const labResults = await getLabResults(patientId);

    // Build timeline series for Recharts
    const glucoseByDate: Record<string, { date: string; fasting?: number; postprandial?: number }> = {};
    const hba1cByDate: Record<string, { date: string; hba1c?: number }> = {};
    const bpByDate: Record<string, { date: string; systolic?: number; diastolic?: number }> = {};

    for (const res of labResults) {
      const d = res.taken_on;
      const lowerName = res.test_name.toLowerCase();

      // Glucose
      if (lowerName.includes("fasting")) {
        if (!glucoseByDate[d]) glucoseByDate[d] = { date: d };
        glucoseByDate[d].fasting = res.value_num;
      } else if (lowerName.includes("postprandial") || lowerName.includes("ppbs")) {
        if (!glucoseByDate[d]) glucoseByDate[d] = { date: d };
        glucoseByDate[d].postprandial = res.value_num;
      }

      // HbA1c
      if (lowerName.includes("hba1c") || lowerName.includes("hemoglobin")) {
        if (!hba1cByDate[d]) hba1cByDate[d] = { date: d };
        hba1cByDate[d].hba1c = res.value_num;
      }

      // Blood Pressure
      if (lowerName.includes("systolic")) {
        if (!bpByDate[d]) bpByDate[d] = { date: d };
        bpByDate[d].systolic = res.value_num;
      } else if (lowerName.includes("diastolic")) {
        if (!bpByDate[d]) bpByDate[d] = { date: d };
        bpByDate[d].diastolic = res.value_num;
      }
    }

    const glucoseSeries = Object.values(glucoseByDate).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const hba1cSeries = Object.values(hba1cByDate).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const bpSeries = Object.values(bpByDate).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return NextResponse.json({
      success: true,
      lab_results: labResults,
      series: {
        glucose: glucoseSeries,
        hba1c: hba1cSeries,
        blood_pressure: bpSeries,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load trend data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const patientId = body.patient_id || "demo-patient-001";

    const val = Number(body.value_num);
    let flag: LabResultFlag = body.flag || "normal";

    const lower = (body.test_name || "").toLowerCase();
    if (!body.flag) {
      if (lower.includes("fasting")) {
        flag = val > 125 ? "critical" : val > 99 ? "high" : val < 70 ? "low" : "normal";
      } else if (lower.includes("postprandial") || lower.includes("ppbs")) {
        flag = val > 199 ? "critical" : val > 140 ? "high" : "normal";
      } else if (lower.includes("hba1c")) {
        flag = val >= 6.5 ? "high" : val >= 5.7 ? "high" : "normal";
      } else if (lower.includes("systolic")) {
        flag = val >= 140 ? "critical" : val >= 120 ? "high" : val < 90 ? "low" : "normal";
      } else if (lower.includes("diastolic")) {
        flag = val >= 90 ? "critical" : val >= 80 ? "high" : val < 60 ? "low" : "normal";
      }
    }

    const result = await addLabResult(patientId, {
      test_name: body.test_name,
      value_num: val,
      value_text: body.value_text || String(val),
      unit: body.unit || "mg/dL",
      ref_range: body.ref_range || "",
      flag,
      taken_on: body.taken_on || new Date().toISOString().split("T")[0],
      lab_name: body.lab_name || "Diagnostic Laboratory",
    });

    return NextResponse.json({
      success: true,
      result,
      message: "Lab reading recorded successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to record lab reading" },
      { status: 500 }
    );
  }
}
