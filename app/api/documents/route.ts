import { NextRequest, NextResponse } from "next/server";
import { documentsStore, StoredDocument } from "@/lib/documents/store";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

export async function GET() {
  const docs = documentsStore.getAll();
  return NextResponse.json({
    success: true,
    documents: docs,
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided in form data" },
        { status: 400 }
      );
    }

    // 1. Enforce max 10MB size limit
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
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

    // 2. Validate magic bytes (PDF %PDF-, JPG \xff\xd8\xff, PNG \x89PNG)
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

    // Generate unique document identifier
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const storagePath = `documents/patient-default/${docId}.${magic.file_type}`;
    const base64DataUrl = `data:${magic.mime_type};base64,${buffer.toString("base64")}`;

    // 3. Attempt Supabase Storage upload, fall back to mock store if unconfigured
    try {
      const supabase = await createClient();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, buffer, {
          contentType: magic.mime_type,
          upsert: true,
        });

      if (uploadError) {
        console.warn("Supabase Storage upload warning (falling back to memory store):", uploadError.message);
      }
    } catch (e: unknown) {
      console.warn("Supabase Storage bypassed:", (e as Error).message);
    }

    // 4. Record document in store
    const newDoc: StoredDocument = {
      id: docId,
      patient_id: "patient-default",
      file_name: file.name || `upload_${docId}.${magic.file_type}`,
      file_type: magic.file_type,
      mime_type: magic.mime_type,
      size_bytes: file.size,
      page_count: magic.file_type === "pdf" ? 1 : 1,
      status: "uploaded",
      confidence_score: 0,
      draft_json: null,
      storage_path: storagePath,
      file_data_url: base64DataUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    documentsStore.save(newDoc);

    return NextResponse.json(
      {
        success: true,
        document: {
          id: newDoc.id,
          file_name: newDoc.file_name,
          file_type: newDoc.file_type,
          size_bytes: newDoc.size_bytes,
          status: newDoc.status,
          storage_path: newDoc.storage_path,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error during upload" },
      { status: 500 }
    );
  }
}
