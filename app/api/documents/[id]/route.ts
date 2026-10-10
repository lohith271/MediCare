import { NextRequest, NextResponse } from "next/server";
import { getMedicalDocuments, deleteMedicalDocument } from "@/lib/data/store";
import { documentsStore } from "@/lib/documents/store";
import { signedUrlOrNull, vaultToDocument, withFileUrl } from "@/lib/documents/links";
import {
  errorResponse,
  requireSignedInPatient,
  resolvePatientAccess,
} from "@/lib/access/patient-access";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const access = await resolvePatientAccess(req, "all");
    if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    const { id } = await params;
    const patientId = access.patientId;

    // Only documents owned by this patient are returned (the store filters by patient_id).
    const doc = await documentsStore.getById(patientId, id);
    if (doc) {
      return NextResponse.json({ success: true, document: await withFileUrl(doc) });
    }

    const vaultRow = (await getMedicalDocuments(patientId)).find((d) => d.id === id);
    if (!vaultRow) {
      return NextResponse.json(
        { success: false, error: `Document with ID "${id}" was not found` },
        { status: 404 }
      );
    }

    const { doc: vaultDoc, legacyUrl } = vaultToDocument(vaultRow);
    const signed = await signedUrlOrNull(vaultDoc.storage_path);
    const external = legacyUrl && /^https:\/\//i.test(legacyUrl) ? legacyUrl : null;
    return NextResponse.json({
      success: true,
      document: { ...vaultRow, file_url: signed ?? external },
    });
  } catch (error: unknown) {
    return errorResponse(error, "Failed to fetch document");
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireSignedInPatient();
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const { id } = await params;

    const success = await deleteMedicalDocument(auth.user.id, id);
    return NextResponse.json(
      { success, message: success ? "Document deleted successfully" : "Document not found" },
      { status: success ? 200 : 404 }
    );
  } catch (error: unknown) {
    return errorResponse(error, "Failed to delete document");
  }
}
