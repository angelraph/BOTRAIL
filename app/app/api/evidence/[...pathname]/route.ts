import { NextResponse } from "next/server";
import { get } from "@vercel/blob";

/// Streams a private evidence file back out of Vercel Blob. There's no
/// per-user auth in this demo (nothing else in the app has any either —
/// it's a single-tenant showcase, not a multi-tenant product), so this is
/// intentionally just a pass-through proxy rather than an access-controlled
/// download endpoint. It exists so evidence uploaded through the app can
/// actually be opened again, not just referenced by filename/hash in the UI.
export async function GET(_request: Request, { params }: { params: Promise<{ pathname: string[] }> }) {
  const { pathname: segments } = await params;
  const pathname = segments.join("/");

  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "evidence file not found" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
    },
  });
}
