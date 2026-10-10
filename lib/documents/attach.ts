import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Adds a `documents` object (doc_date, doc_type, doctor, hospital) to each row that has a document_id.
 * Done as a second query because the tables have no foreign key for PostgREST to join on.
 * Mutates the rows in place and keeps the same shape the joined query used to return.
 */
export async function attachDocuments(
  client: SupabaseClient,
  rows: Array<{ document_id?: string | null; documents?: unknown }> | null | undefined
): Promise<void> {
  if (!rows || rows.length === 0) return;
  const ids = [...new Set(rows.map((r) => r.document_id).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) {
    for (const r of rows) r.documents = null;
    return;
  }

  const { data, error } = await client
    .from("documents")
    .select("id, doc_date, doc_type, doctor, hospital")
    .in("id", ids);
  if (error) throw new Error(`Loading source documents failed: ${error.message}`);

  const byId = new Map((data ?? []).map((d) => [d.id as string, d]));
  for (const r of rows) {
    r.documents = r.document_id ? byId.get(r.document_id) ?? null : null;
  }
}
