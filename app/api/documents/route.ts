import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  getMedicalDocuments,
  addMedicalDocument,
  deleteMedicalDocument,
} from "@/lib/data/store";
import {
  documentsStore,
  deleteMedicalFile,
  uploadMedicalFile,
  type StoredDocument,
} from "@/lib/documents/store";
import { vaultToDocument, withFileUrl, type ListedDocument } from "@/lib/documents/links";
import {
  errorResponse,
  requireSignedInPatient,
  resolvePatientAccess,
} from "@/lib/access/patient-access";

export const runtime = "nodejs";

// Magic Bytes definitions
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const JPG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]); // \xff\xd8\xff
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // \x89PNG

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

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

/** Patient's documents (extraction store plus vault). Doctors with an "all" share code may read. */
export async function GET(req: NextRequest) {
  try {
    const access = await resolvePatientAccess(req, "all");
    if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const patientId = access.patientId;

    const [extractionDocs, vaultDocs] = await Promise.all([
      documentsStore.getAll(patientId),
      getMedicalDocuments(patientId),
    ]);

    const listed: Array<{ doc: StoredDocument; legacyUrl: string | null }> = extractionDocs.map((doc) => ({
      doc,
      legacyUrl: null,
    }));
    for (const v of vaultDocs) {
      if (!listed.some((item) => item.doc.id === v.id)) {
        listed.push(vaultToDocument(v));
      }
    }

    const documents: ListedDocument[] = await Promise.all(
      listed.map((item) => withFileUrl(item.doc, item.legacyUrl))
    );

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
    });
  } catch (error: unknown) {
    console.error("GET /api/documents error:", error);
    return errorResponse(error, "Failed to fetch medical documents");
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const patientId = auth.user.id;

    const contentType = req.headers.get("content-type") || "";

    // 1. Multipart file upload: magic-byte check and 10MB cap, bytes go to the private bucket.
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
      }

      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File size exceeds 10MB limit (uploaded: ${(file.size / 1024 / 1024).toFixed(2)}MB)` },
          { status: 400 }
        );
      }

      if (file.size === 0) {
        return NextResponse.json({ error: "File is empty (0 bytes)" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

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

      const fileName = file.name || `upload.${magic.file_type}`;
      const storagePath = await uploadMedicalFile(patientId, fileName, new Uint8Array(buffer), magic.mime_type);

      try {
        const now = new Date().toISOString();
        const saved = await documentsStore.save({
          id: randomUUID(),
          patient_id: patientId,
          file_name: fileName,
          file_type: magic.file_type,
          mime_type: magic.mime_type,
          size_bytes: file.size,
          page_count: 1,
          status: "uploaded",
          confidence_score: 0,
          draft_json: null,
          storage_path: storagePath,
          created_at: now,
          updated_at: now,
        });

        // Also register in the medical vault, pointing at the same stored file.
        await addMedicalDocument(patientId, {
          title: fileName,
          category: magic.file_type === "pdf" ? "prescription_pdf" : "lab_pdf",
          file_name: fileName,
          file_type: magic.mime_type,
          file_size_bytes: file.size,
          storage_path: storagePath,
          doc_date: now.split("T")[0],
          doctor: "",
          hospital: "",
          notes: "Uploaded through extraction engine",
        });

        const document = await withFileUrl(saved);
        return NextResponse.json({ success: true, document }, { status: 201 });
      } catch (err) {
        // Do not leave an orphaned file behind if the records were not written.
        await deleteMedicalFile(storagePath).catch(() => undefined);
        throw err;
      }
    }

    // 2. JSON payload: a link to an existing https file. Inline data URLs are not accepted.
    const body = await req.json().catch(() => ({}));

    if (!body.title || !body.file_url) {
      return NextResponse.json(
        { success: false, error: "Document title and file URL or data are required" },
        { status: 400 }
      );
    }
    if (typeof body.file_url !== "string" || !/^https:\/\//i.test(body.file_url)) {
      return NextResponse.json(
        {
          success: false,
          error: "Upload the file as multipart form data. Only https links are accepted in JSON.",
        },
        { status: 400 }
      );
    }

    const newDoc = await addMedicalDocument(patientId, {
      title: body.title,
      category: body.category || "other",
      file_name: body.file_name || "document.jpg",
      file_type: body.file_type || "image/jpeg",
      file_size_bytes: body.file_size_bytes || 0,
      file_url: body.file_url,
      doc_date: body.doc_date || new Date().toISOString().split("T")[0],
      doctor: body.doctor || "",
      hospital: body.hospital || "",
      notes: body.notes || "",
    });

    return NextResponse.json(
      { success: true, document: newDoc },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/documents error:", error);
    return errorResponse(error, "Failed to create medical document");
  }
}

/** Deletes a vault entry and its stored file. Only the signed-in patient's own rows are removed. */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Document ID is required" }, { status: 400 });
    }

    const success = await deleteMedicalDocument(auth.user.id, id);
    return NextResponse.json(
      { success, message: success ? "Document deleted successfully" : "Document not found" },
      { status: success ? 200 : 404 }
    );
  } catch (error: unknown) {
    console.error("DELETE /api/documents error:", error);
    return errorResponse(error, "Failed to delete medical document");
  }
}
