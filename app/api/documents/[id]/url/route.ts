import { NextRequest, NextResponse } from "next/server";
import { documentsStore, createSignedFileUrl } from "@/lib/documents/store";
import { getMedicalDocuments } from "@/lib/data/store";
import { errorResponse, resolvePatientAccess } from "@/lib/access/patient-access";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Fresh, short-lived link to a file the caller may read. Only the patient's own files resolve. */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const access = await resolvePatientAccess(req, "all");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const { id } = await context.params;
    const patientId = access.patientId;

    let storagePath: string | null = null;
    let fileType: string | null = null;
    let fileName: string | null = null;

    const doc = await documentsStore.getById(patientId, id);
    if (doc) {
      storagePath = doc.storage_path;
      fileType = doc.file_type;
      fileName = doc.file_name;
    } else {
      const vault = (await getMedicalDocuments(patientId)).find((d) => d.id === id);
      if (vault) {
        storagePath = (vault as { storage_path?: string | null }).storage_path ?? null;
        fileType = vault.file_type?.includes("pdf") ? "pdf" : "jpg";
        fileName = vault.file_name || vault.title;
      }
    }

    if (!storagePath || !fileType || !fileName) {
      return NextResponse.json(
        { error: `Document with ID "${id}" was not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      url: await createSignedFileUrl(storagePath),
      file_type: fileType,
      file_name: fileName,
    });
  } catch (error: unknown) {
    return errorResponse(error, "Failed to create file link");
  }
}
