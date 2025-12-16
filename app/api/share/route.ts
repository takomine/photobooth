"use server";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

type StoredShare = {
  id: string;
  data: Buffer;
  mime: string;
  filename: string;
  expiresAt: number;
};

// Simple in-memory store (persists while the server process is alive)
const store: Map<string, StoredShare> = new Map();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const cleanup = () => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) {
      store.delete(key);
    }
  }
};

export async function POST(req: NextRequest) {
  try {
    cleanup();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file missing" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const id = randomUUID();
    store.set(id, {
      id,
      data: Buffer.from(arrayBuffer),
      mime: file.type || "application/octet-stream",
      filename: file.name || "photobooth.png",
      expiresAt: Date.now() + ONE_DAY_MS,
    });
    const url = new URL(req.url);
    url.pathname = `/api/share/${id}`;
    return NextResponse.json({
      id,
      url: url.toString(),
      expiresAt: store.get(id)?.expiresAt,
      ttlHours: 24,
    });
  } catch (err) {
    console.error("share upload failed", err);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}


