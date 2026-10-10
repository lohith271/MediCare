import { NextRequest, NextResponse } from "next/server";
import { documentsStore } from "@/lib/documents/store";
import { withFileUrl } from "@/lib/documents/links";
import { MedicalDataExtract } from "@/lib/llm/adapter";
import { errorResponse, requireSignedInPatient } from "@/lib/access/patient-access";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const patientId = auth.user.id;
    const { id } = await context.params;

    const doc = await documentsStore.getById(patientId, id);
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

    // Counts of the extracted items. The clinical tables are not written here yet.
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

    const updated = await documentsStore.updateStatus(patientId, id, "confirmed", {
      draft_json: confirmedData,
    });

    return NextResponse.json({
      success: true,
      message: "Document confirmed and clinical records successfully synchronized",
      document_id: id,
      document: updated ? await withFileUrl(updated) : null,
      records_created: {
        medications: medsCount,
        lab_results: labsCount,
        diagnoses: diagCount,
        allergies: allergyCount,
      },
    });
  } catch (error: unknown) {
    console.error("Confirmation error:", error);
    return errorResponse(error, "Internal server error during confirmation");
  }
}
