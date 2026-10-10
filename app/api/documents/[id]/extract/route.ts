import { NextRequest, NextResponse } from "next/server";
import { documentsStore } from "@/lib/documents/store";
import { extractMedicalData, MedicalDataExtract } from "@/lib/llm/adapter";
import { normalizeMedicineName, normalizeFrequency } from "@/lib/normalize";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout for long vision/LLM extraction calls

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // 1. Read document by ID
    const doc = documentsStore.getById(id);
    if (!doc) {
      return NextResponse.json(
        { error: `Document with ID "${id}" was not found` },
        { status: 404 }
      );
    }

    // Set status to extracting
    documentsStore.updateStatus(id, "extracting");

    // 2. Prepare file buffer from stored base64 or storage
    let fileBuffer: Buffer;
    if (doc.file_data_url) {
      const base64Data = doc.file_data_url.split(",")[1];
      fileBuffer = Buffer.from(base64Data, "base64");
    } else {
      // Mock minimal buffer for simulated docs
      fileBuffer = Buffer.from(doc.file_type === "pdf" ? "%PDF-1.4 simulated" : "\xff\xd8\xff simulated");
    }

    // 3. Call extractMedicalData()
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
    const updatedDoc = documentsStore.updateStatus(id, "needs_review", {
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
      document: updatedDoc,
      extraction: normalizedExtraction,
    });
  } catch (error: unknown) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error during extraction" },
      { status: 500 }
    );
  }
}