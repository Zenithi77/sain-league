import { NextRequest, NextResponse } from "next/server";
import { readDatabase, writeDatabase } from "@/lib/database";
import { v4 as uuidv4 } from "uuid";

// GET /api/podcasts — get all podcasts
export async function GET() {
  try {
    const db = readDatabase() as any;
    const podcasts = (db.podcasts || []).sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return NextResponse.json(podcasts);
  } catch (error) {
    console.error("Error fetching podcasts:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/podcasts — create a podcast
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, youtubeUrl, description } = body;

    if (!title || !youtubeUrl) {
      return NextResponse.json(
        { error: "Title and YouTube URL are required" },
        { status: 400 },
      );
    }

    const db = readDatabase() as any;
    const newPodcast = {
      id: `podcast-${uuidv4().slice(0, 8)}`,
      title,
      youtubeUrl,
      description: description || "",
      date: new Date().toISOString(),
    };

    db.podcasts = [...(db.podcasts || []), newPodcast];
    writeDatabase(db);

    return NextResponse.json(newPodcast, { status: 201 });
  } catch (error) {
    console.error("Error creating podcast:", error);
    return NextResponse.json(
      { error: "Failed to create podcast" },
      { status: 500 },
    );
  }
}
