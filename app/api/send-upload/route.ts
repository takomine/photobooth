"use server";

import { NextRequest, NextResponse } from "next/server";
import { tmpdir } from "os";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file missing" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    const tmpName = `pb-share-${randomUUID()}.png`;
    const tmpPath = path.join(tmpdir(), tmpName);
    await fs.writeFile(tmpPath, data);

    const exePath = path.join(process.cwd(), "ffsend.exe");

    try {
      // Note: --downloads flag omitted to allow unlimited downloads
      // Only expiry-time is set to 24 hours
      const { stdout, stderr } = await execFileAsync(exePath, [
        "upload",
        "--no-interact",
        "--expiry-time",
        "24h",
        tmpPath,
      ]);

      const output = `${stdout}\n${stderr}`.trim();
      const urlMatch = output.match(/https?:\/\/\S+/);
      if (!urlMatch) {
        return NextResponse.json(
          { error: "No share URL returned", output },
          { status: 500 }
        );
      }

      return NextResponse.json({
        url: urlMatch[0],
        ttlHours: 24,
        output,
      });
    } finally {
      // Clean up temp file regardless of success/failure
      fs.unlink(tmpPath).catch(() => {});
    }
  } catch (err) {
    console.error("send-upload failed", err);
    const message = err instanceof Error ? err.message : "send-upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


