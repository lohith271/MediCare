import { NextRequest, NextResponse } from "next/server";
import { documentsStore, downloadMedicalFile } from "@/lib/documents/store";
import { withFileUrl } from "@/lib/documents/links";
import { extractMedicalData, MedicalDataExtract } from "@/lib/llm/adapter";
import { normalizeMedicineName, normalizeFrequency } from "@/lib/normalize";
import { errorResponse, requireSignedInPatient } from "@/lib/access/patient-access";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout for long vision/LLM extraction calls

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const patientId = auth.user.id;
    const { id } = await context.params;

    // 1. Read the document, only if it belongs to this patient
    const doc = await documentsStore.getById(patientId, id);
    if (!doc) {
      return NextResponse.json(
        { error: `Document with ID "${id}" was not found` },
        { status: 404 }
      );
    }

    await documentsStore.updateStatus(patientId, id, "extracting");

    try {
      // 2. Read the file bytes from the private bucket
      const fileBuffer = Buffer.from(await downloadMedicalFile(doc.storage_path));

      // 3. Call extractMedicalData() (it takes the raw bytes as a Buffer)
      const rawExtraction: MedicalDataExtract = await extractMedicalData(
        fileBuffer,
        doc.mime_type || (doc.file_type === "pdf" ? "application/pdf" : "image/jpeg")
      );

      // 4. Pass output through normalization functions
      const normalizedExtraction = { ...rawExtraction };

      if (normalizedExtraction.document_type === "prescription") {
        normalizedExtraction.medications = normalizedExtraction.medications.map((med) => ({
          ...med,
          generic_name: normalizeMedicineName(med.name),
          frequency: normalizeFrequency(med.frequency),
        }));
      } else if (normalizedExtraction.document_type === "discharge_summary") {
        normalizedExtraction.medications = normalizedExtraction.medications.map((med) => ({
          ...med,
          generic_name: normalizeMedicineName(med.name),
          frequency: normalizeFrequency(med.frequency),
        }));
      }

      // 5. Save to documents.draft_json with status needs_review
      const updatedDoc = await documentsStore.updateStatus(patientId, id, "needs_review", {
        draft_json: normalizedExtraction,
        confidence_score: normalizedExtraction.confidence_score,
        doc_type: normalizedExtraction.document_type,
        doc_date:
          "document_date" in normalizedExtraction
            ? normalizedExtraction.document_date
            : new Date().toISOString().slice(0, 10),
        doctor:
          "doctor_name" in normalizedExtraction
            ? normalizedExtraction.doctor_name
            : undefined,
        hospital:
          "clinic_name" in normalizedExtraction
            ? normalizedExtraction.clinic_name
            : "hospital_name" in normalizedExtraction
            ? normalizedExtraction.hospital_name
            : undefined,
      });

      return NextResponse.json({
        success: true,
        document: updatedDoc ? await withFileUrl(updatedDoc) : null,
        extraction: normalizedExtraction,
      });
    } catch (err) {
      await documentsStore.updateStatus(patientId, id, "failed").catch(() => null);
      throw err;
    }
  } catch (error: unknown) {
    console.error("Extraction error:", error);
    return errorResponse(error, "Internal server error during extraction");
  }
}
