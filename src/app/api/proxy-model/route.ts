import { NextRequest, NextResponse } from "next/server";

/** Allowed hostnames for SSRF prevention. */
const ALLOWED_HOSTS = new Set(["assets.meshy.ai", "storage.googleapis.com"]);

/**
 * Proxy GLB model files to avoid CORS issues.
 * Only allows URLs from Meshy CDN and Firebase Storage for security.
 *
 * Usage: GET /api/proxy-model?url=<encoded-url>
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 },
    );
  }

  // Only allow known CDN / storage hosts to prevent SSRF
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(url);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status },
      );
    }

    const body = await upstream.arrayBuffer();
    const contentType =
      upstream.headers.get("content-type") || "model/gltf-binary";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[proxy-model] Fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch model" },
      { status: 502 },
    );
  }
}
