"use server";

import { NextRequest, NextResponse } from "next/server";

type StoredShare = {
  id: string;
  data: Buffer;
  mime: string;
  filename: string;
  expiresAt: number;
};

const store: Map<string, StoredShare> = (globalThis as any).__shareStore ?? new Map();
(globalThis as any).__shareStore = store;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const cleanup = () => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) {
      store.delete(key);
    }
  }
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  cleanup();
  const item = store.get(params.id);
  if (!item) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(item.data, {
    status: 200,
    headers: {
      "Content-Type": item.mime,
      "Content-Disposition": `attachment; filename="${item.filename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Expires: new Date(item.expiresAt).toUTCString(),
    },
  });
}

