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
    success: true,
    document: doc,
  });
}
