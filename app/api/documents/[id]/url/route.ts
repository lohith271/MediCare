import { NextRequest, NextResponse } from "next/server";
import { documentsStore } from "@/lib/documents/store";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const doc = documentsStore.getById(id);

  if (!doc) {
    return NextResponse.json(
      { error: `Document with ID "${id}" was not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    url: doc.file_data_url || `/api/documents/${id}`,
    file_type: doc.file_type,
    file_name: doc.file_name,
  });
}