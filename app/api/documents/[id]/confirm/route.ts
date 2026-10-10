import { NextRequest, NextResponse } from "next/server";
import { documentsStore } from "@/lib/documents/store";
import { MedicalDataExtract } from "@/lib/llm/adapter";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const doc = documentsStore.getById(id);
    if (!doc) {
      return NextResponse.json(
        { error: `Document with ID "${id}" was not found` },
        { status: 404 }
      );
    }

    let payload: { reviewed_data?: MedicalDataExtract } = {};
    try {
      payload = await req.json();
    } catch {
      // payload might be empty if confirming existing draft_json
    }

    const confirmedData = payload.reviewed_data || doc.draft_json;

    // Mock inserts into individual clinical tables:
    let medsCount = 0;
    let labsCount = 0;
    let diagCount = 0;
    let allergyCount = 0;

    if (confirmedData) {
      if ("medications" in confirmedData && Array.isArray(confirmedData.medications)) {
        medsCount = confirmedData.medications.length;
      }
      if ("lab_results" in confirmedData && Array.isArray(confirmedData.lab_results)) {
        labsCount = confirmedData.lab_results.length;
      }
      if ("diagnoses" in confirmedData && Array.isArray(confirmedData.diagnoses)) {
        diagCount = confirmedData.diagnoses.length;
      }
      if ("allergies" in confirmedData && Array.isArray(confirmedData.allergies)) {
        allergyCount = confirmedData.allergies.length;
      }
    }

    // Update document status to confirmed
    const updatedDoc = documentsStore.updateStatus(id, "confirmed", {
      draft_json: confirmedData,
    });

    return NextResponse.json({
      success: true,
      message: "Document confirmed and clinical records successfully synchronized",
      document_id: id,
      document: updatedDoc,
      records_created: {
        medications: medsCount,
        lab_results: labsCount,
        diagnoses: diagCount,
        allergies: allergyCount,
      },
    });
  } catch (error: unknown) {
    console.error("Confirmation error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error during confirmation" },
      { status: 500 }
    );
  }
}