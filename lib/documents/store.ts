/**
 * MediCare document store (Supabase Postgres + private Storage bucket).
 * Every function takes the patient id, so callers must pass the id they verified.
 */

import { MedicalDataExtract } from "@/lib/llm/adapter";
import { createAdminClient } from "@/lib/supabase/server";

export type DocumentStatus = "uploaded" | "extracting" | "needs_review" | "confirmed" | "failed";

export const MEDICAL_FILES_BUCKET = "medical-files";

export interface StoredDocument {
  id: string;
  patient_id: string;
  file_name: string;
  file_type: "pdf" | "jpg" | "png";
  mime_type: string;
  size_bytes: number;
  page_count: number;
  doc_type?: string;
  doc_date?: string;
  doctor?: string;
  hospital?: string;
  status: DocumentStatus;
  confidence_score: number;
  draft_json: MedicalDataExtract | null;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

type DocumentRow = {
  id: string;
  patient_id: string;
  file_name: string;
  file_type: "pdf" | "jpg" | "png";
  mime_type: string;
  size_bytes: number;
  page_count: number;
  doc_type: string | null;
  doc_date: string | null;
  doctor: string | null;
  hospital: string | null;
  status: DocumentStatus;
  confidence_score: number | null;
  draft_json: MedicalDataExtract | null;
  storage_path: string;
  created_at: string;
  updated_at: string;
};

function toStored(row: DocumentRow): StoredDocument {
  return {
    id: row.id,
    patient_id: row.patient_id,
    file_name: row.file_name,
    file_type: row.file_type,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    page_count: row.page_count,
    doc_type: row.doc_type ?? undefined,
    doc_date: row.doc_date ?? undefined,
    doctor: row.doctor ?? undefined,
    hospital: row.hospital ?? undefined,
    status: row.status,
    confidence_score: Number(row.confidence_score ?? 0),
    draft_json: row.draft_json,
    storage_path: row.storage_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toRow(doc: StoredDocument): Omit<DocumentRow, "created_at" | "updated_at"> & {
  created_at: string;
  updated_at: string;
} {
  return {
    id: doc.id,
    patient_id: doc.patient_id,
    file_name: doc.file_name,
    file_type: doc.file_type,
    mime_type: doc.mime_type,
    size_bytes: doc.size_bytes,
    page_count: doc.page_count,
    doc_type: doc.doc_type ?? null,
    doc_date: doc.doc_date ?? null,
    doctor: doc.doctor ?? null,
    hospital: doc.hospital ?? null,
    status: doc.status,
    confidence_score: doc.confidence_score,
    draft_json: doc.draft_json,
    storage_path: doc.storage_path,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

function fail(action: string, error: { message: string } | null): never {
  throw new Error(`${action} failed: ${error?.message ?? "unknown error"}`);
}

export const documentsStore = {
  async getAll(patientId: string): Promise<StoredDocument[]> {
    const { data, error } = await createAdminClient()
      .from("documents")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) fail("Loading documents", error);
    return ((data ?? []) as DocumentRow[]).map(toStored);
  },

  /** Returns the document only when it belongs to `patientId`. */
  async getById(patientId: string, id: string): Promise<StoredDocument | null> {
    const { data, error } = await createAdminClient()
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("patient_id", patientId)
      .maybeSingle();
    if (error) fail("Loading document", error);
    return data ? toStored(data as DocumentRow) : null;
  },

  async save(doc: StoredDocument): Promise<StoredDocument> {
    const now = new Date().toISOString();
    const row = { ...toRow(doc), updated_at: now };
    const { data, error } = await createAdminClient()
      .from("documents")
      .upsert(row)
      .select("*")
      .single();
    if (error) fail("Saving document", error);
    return toStored(data as DocumentRow);
  },

  async updateStatus(
    patientId: string,
    id: string,
    status: DocumentStatus,
    updates?: Partial<StoredDocument>
  ): Promise<StoredDocument | null> {
    const { draft_json, doc_type, doc_date, doctor, hospital, confidence_score } = updates ?? {};
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (draft_json !== undefined) patch.draft_json = draft_json;
    if (doc_type !== undefined) patch.doc_type = doc_type;
    if (doc_date !== undefined) patch.doc_date = doc_date;
    if (doctor !== undefined) patch.doctor = doctor;
    if (hospital !== undefined) patch.hospital = hospital;
    if (confidence_score !== undefined) patch.confidence_score = confidence_score;

    const { data, error } = await createAdminClient()
      .from("documents")
      .update(patch)
      .eq("id", id)
      .eq("patient_id", patientId)
      .select("*")
      .maybeSingle();
    if (error) fail("Updating document", error);
    return data ? toStored(data as DocumentRow) : null;
  },
};

/** Uploads file bytes to the private bucket. Returns the storage path. */
export async function uploadMedicalFile(
  patientId: string,
  fileName: string,
  bytes: Uint8Array,
  mimeType: string
): Promise<string> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${patientId}/${Date.now()}-${safeName}`;
  const { error } = await createAdminClient()
    .storage.from(MEDICAL_FILES_BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) fail("Uploading file", error);
  return path;
}

/** Downloads stored file bytes (used by the extraction pipeline). */
export async function downloadMedicalFile(storagePath: string): Promise<Uint8Array> {
  const { data, error } = await createAdminClient()
    .storage.from(MEDICAL_FILES_BUCKET)
    .download(storagePath);
  if (error || !data) fail("Downloading file", error);
  return new Uint8Array(await data.arrayBuffer());
}

/** Short-lived link to a private file. Expires after `expiresIn` seconds. */
export async function createSignedFileUrl(storagePath: string, expiresIn = 300): Promise<string> {
  const { data, error } = await createAdminClient()
    .storage.from(MEDICAL_FILES_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data) fail("Creating file link", error);
  return data.signedUrl;
}

export async function deleteMedicalFile(storagePath: string): Promise<void> {
  await createAdminClient().storage.from(MEDICAL_FILES_BUCKET).remove([storagePath]);
}
