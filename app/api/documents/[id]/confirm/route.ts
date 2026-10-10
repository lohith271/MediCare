import { NextRequest, NextResponse } from "next/server";
import { documentsStore } from "@/lib/documents/store";
import { withFileUrl } from "@/lib/documents/links";
import { MedicalDataExtract } from "@/lib/llm/adapter";
import { commitExtraction } from "@/lib/documents/commit";
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

    if (!confirmedData) {
      return NextResponse.json({ error: "Nothing to confirm: the document has no extracted data" }, { status: 400 });
    }

    // Write the reviewed items to the clinical tables first; only then mark the document confirmed.
    const counts = await commitExtraction(patientId, id, confirmedData);

    const updated = await documentsStore.updateStatus(patientId, id, "confirmed", {
      draft_json: confirmedData,
    });

    return NextResponse.json({
      success: true,
      message: "Document confirmed and clinical records saved",
      document_id: id,
      document: updated ? await withFileUrl(updated) : null,
      records_created: counts,
    });
  } catch (error: unknown) {
    console.error("Confirmation error:", error);
    return errorResponse(error, "Internal server error during confirmation");
  }
}
