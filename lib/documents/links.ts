import { createSignedFileUrl, type StoredDocument } from "@/lib/documents/store";
import type { MedicalDocument } from "@/lib/types/database";

/** A document as the UI receives it: always carries a fresh `file_url` (or null). */
export type ListedDocument = StoredDocument & { file_url: string | null };

/** Fresh short-lived link for a private file. Null when there is no file or signing fails. */
export async function signedUrlOrNull(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath) return null;
  try {
    return await createSignedFileUrl(storagePath);
  } catch (err) {
    console.error("[documents] could not sign file link:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Adds `file_url`. Stored files get a signed link computed now. Legacy rows that
 * hold an external https link keep that link. Inline data URLs are never returned.
 */
export async function withFileUrl(
  doc: StoredDocument,
  legacyUrl?: string | null
): Promise<ListedDocument> {
  const signed = await signedUrlOrNull(doc.storage_path);
  const external = legacyUrl && /^https?:\/\//i.test(legacyUrl) ? legacyUrl : null;
  return { ...doc, file_url: signed ?? external };
}

/** Maps a vault (medical_documents) row onto the document shape the UI uses. */
export function vaultToDocument(v: MedicalDocument & { storage_path?: string | null }): {
  doc: StoredDocument;
  legacyUrl: string | null;
} {
  const storagePath = v.storage_path ?? "";
  return {
    doc: {
      id: v.id,
      patient_id: v.patient_id,
      file_name: v.file_name || v.title,
      file_type: (v.file_type?.includes("pdf") ? "pdf" : "jpg") as "pdf" | "jpg" | "png",
      mime_type: v.file_type || "application/pdf",
      size_bytes: v.file_size_bytes || 0,
      page_count: 1,
      doc_type: v.category || "medical_record",
      doc_date: v.doc_date,
      doctor: v.doctor ?? undefined,
      hospital: v.hospital ?? undefined,
      status: "confirmed",
      confidence_score: 95,
      draft_json: null,
      storage_path: storagePath,
      created_at: v.created_at || new Date().toISOString(),
      updated_at: v.created_at || new Date().toISOString(),
    },
    legacyUrl: v.file_url ?? null,
  };
}
