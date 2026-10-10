import { NextRequest, NextResponse } from "next/server";
import {
  getMedicalDocuments,
  addMedicalDocument,
  deleteMedicalDocument,
} from "@/lib/data/store";
import { documentsStore, StoredDocument } from "@/lib/documents/store";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DEFAULT_PATIENT_ID = "demo-patient-001";

// Magic Bytes definitions
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const JPG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]); // \xff\xd8\xff
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // \x89PNG

function detectMagicBytes(buffer: Buffer): { valid: boolean; file_type: "pdf" | "jpg" | "png"; mime_type: string } {
  if (buffer.length >= 5 && buffer.subarray(0, 5).equals(PDF_MAGIC)) {
    return { valid: true, file_type: "pdf", mime_type: "application/pdf" };
  }
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(JPG_MAGIC)) {
    return { valid: true, file_type: "jpg", mime_type: "image/jpeg" };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(PNG_MAGIC)) {
    return { valid: true, file_type: "png", mime_type: "image/png" };
  }
  return { valid: false, file_type: "pdf", mime_type: "" };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patient_id") || DEFAULT_PATIENT_ID;

    // Retrieve documents from both medical vault and extraction store
    const vaultDocs = await getMedicalDocuments(patientId);
    const extractionDocs = documentsStore.getAll().filter((d) => d.patient_id === patientId);

    // Map extraction docs into combined list if not already present
    const combinedDocs = [...extractionDocs];
    for (const vDoc of vaultDocs) {
      if (!combinedDocs.some((d) => d.id === vDoc.id)) {
        combinedDocs.push({
          id: vDoc.id,
          patient_id: vDoc.patient_id,
          file_name: vDoc.file_name || vDoc.title,
          file_type: (vDoc.file_type?.includes("pdf") ? "pdf" : "jpg") as "pdf" | "jpg" | "png",
          mime_type: vDoc.file_type || "application/pdf",
          size_bytes: vDoc.file_size_bytes || 1024 * 1024,
          page_count: 1,
          doc_type: vDoc.category || "medical_record",
          doc_date: vDoc.doc_date,
          doctor: vDoc.doctor,
          hospital: vDoc.hospital,
          status: "confirmed",
          confidence_score: 95,
          draft_json: null,
          storage_path: vDoc.file_url,
          file_data_url: vDoc.file_url,
          created_at: vDoc.created_at || new Date().toISOString(),
          updated_at: vDoc.created_at || new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      documents: combinedDocs,
      count: combinedDocs.length,
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
    const contentType = req.headers.get("content-type") || "";

    // 1. Handle multipart/form-data file uploads (with Magic Bytes & 10MB check)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const reqPatientId = (formData.get("patient_id") as string) || DEFAULT_PATIENT_ID;

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: "No file provided in form data" },
          { status: 400 }
        );
      }

      // Enforce max 10MB size limit
      const MAX_SIZE_BYTES = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File size exceeds 10MB limit (uploaded: ${(file.size / 1024 / 1024).toFixed(2)}MB)` },
          { status: 400 }
        );
      }

      if (file.size === 0) {
        return NextResponse.json(
          { error: "File is empty (0 bytes)" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate magic bytes
      const magic = detectMagicBytes(buffer);
      if (!magic.valid) {
        return NextResponse.json(
          {
            error:
              "Invalid file format: Magic bytes signature did not match PDF, JPG, or PNG. Spoofed file extensions are rejected.",
          },
          { status: 400 }
        );
      }

      const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const storagePath = `documents/${reqPatientId}/${docId}.${magic.file_type}`;
      const base64DataUrl = `data:${magic.mime_type};base64,${buffer.toString("base64")}`;

      // Upload to Supabase Storage if available
      try {
        const supabase = await createClient();
        await supabase.storage
          .from("documents")
          .upload(storagePath, buffer, {
            contentType: magic.mime_type,
            upsert: true,
          });
      } catch (e: unknown) {
        // Silently bypass storage in offline mode
      }

      const newDoc: StoredDocument = {
        id: docId,
        patient_id: reqPatientId,
        file_name: file.name || `upload_${docId}.${magic.file_type}`,
        file_type: magic.file_type,
        mime_type: magic.mime_type,
        size_bytes: file.size,
        page_count: 1,
        status: "uploaded",
        confidence_score: 0,
        draft_json: null,
        storage_path: storagePath,
        file_data_url: base64DataUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      documentsStore.save(newDoc);

      // Also register in medical vault store
      await addMedicalDocument(reqPatientId, {
        title: file.name,
        category: magic.file_type === "pdf" ? "prescription_pdf" : "lab_pdf",
        file_name: file.name,
        file_type: magic.mime_type,
        file_size_bytes: file.size,
        file_url: base64DataUrl,
        doc_date: new Date().toISOString().split("T")[0],
        doctor: "",
        hospital: "",
        notes: "Uploaded through extraction engine",
      });

      return NextResponse.json(
        {
          success: true,
          document: newDoc,
        },
        { status: 201 }
      );
    }

    // 2. Handle JSON payload uploads
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
