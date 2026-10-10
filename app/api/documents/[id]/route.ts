import { NextRequest, NextResponse } from "next/server";
import { getMedicalDocuments, deleteMedicalDocument } from "@/lib/data/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docs = await getMedicalDocuments("demo-patient-001");
    const doc = docs.find((d) => d.id === id);

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, document: doc });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
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
