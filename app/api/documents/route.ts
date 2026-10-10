import { NextRequest, NextResponse } from "next/server";
import {
  getMedicalDocuments,
  addMedicalDocument,
  deleteMedicalDocument,
} from "@/lib/data/store";

const DEFAULT_PATIENT_ID = "demo-patient-001";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patient_id") || DEFAULT_PATIENT_ID;

    const documents = await getMedicalDocuments(patientId);

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
    });
  } catch (error: any) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch medical documents",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const patientId = body.patient_id || DEFAULT_PATIENT_ID;

    if (!body.title || !body.file_url) {
      return NextResponse.json(
        {
          success: false,
          error: "Document title and file URL or data are required",
        },
        { status: 400 }
      );
    }

    const newDoc = await addMedicalDocument(patientId, {
      title: body.title,
      category: body.category || "other",
      file_name: body.file_name || "document.jpg",
      file_type: body.file_type || "image/jpeg",
      file_size_bytes: body.file_size_bytes || 1024 * 1024,
      file_url: body.file_url,
      doc_date: body.doc_date || new Date().toISOString().split("T")[0],
      doctor: body.doctor || "",
      hospital: body.hospital || "",
      notes: body.notes || "",
    });

    return NextResponse.json(
      {
        success: true,
        document: newDoc,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to create medical document",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Document ID is required",
        },
        { status: 400 }
      );
    }

    const success = await deleteMedicalDocument(id);

    return NextResponse.json({
      success,
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/documents error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to delete medical document",
      },
      { status: 500 }
    );
  }
}
