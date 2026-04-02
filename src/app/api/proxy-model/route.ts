import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy GLB model files from Meshy's CDN to avoid CORS issues.
 * Only allows URLs from assets.meshy.ai for security (SSRF prevention).
 *
 * Usage: GET /api/proxy-model?url=<encoded-meshy-url>
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 },
    );
  }

  // Only allow Meshy CDN URLs to prevent SSRF
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.hostname !== "assets.meshy.ai") {
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
