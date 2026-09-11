import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { NextRequest } from "next/server";

const MIME: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: rawName } = await params;
  const name = rawName.replace(/[^a-zA-Z0-9._-]/g, "");
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext];
  if (!mime) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const body = await readFile(join(process.cwd(), "assets", name));
    return new Response(body, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}