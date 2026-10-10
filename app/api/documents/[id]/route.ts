import { NextRequest, NextResponse } from "next/server";
import { getMedicalDocuments, deleteMedicalDocument } from "@/lib/data/store";
import { documentsStore } from "@/lib/documents/store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First check extraction documentsStore
    const doc = documentsStore.getById(id);
    if (doc) {
      return NextResponse.json({ success: true, document: doc });
    }

    // Fall back to medical records store
    const docs = await getMedicalDocuments("demo-patient-001");
    const foundDoc = docs.find((d) => d.id === id);

    if (!foundDoc) {
      return NextResponse.json(
        { success: false, error: `Document with ID "${id}" was not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, document: foundDoc });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteMedicalDocument(id);

    return NextResponse.json({
      success,
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete document" },
      { status: 500 }
    );
  }
}
