import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

const COLLECTION = "podcasts";

// GET /api/podcasts — get all podcasts (sorted by date desc)
export async function GET() {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy("date", "desc")
      .get();

    const podcasts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(podcasts);
  } catch (error) {
    console.error("Error fetching podcasts:", error);
    return NextResponse.json(
      { error: "Failed to fetch podcasts" },
      { status: 500 },
    );
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

    const db = getAdminFirestore();
    const docRef = db.collection(COLLECTION).doc();

    const newPodcast = {
      title,
      youtubeUrl,
      description: description || "",
      date: new Date().toISOString(),
    };

    await docRef.set(newPodcast);

    return NextResponse.json({ id: docRef.id, ...newPodcast }, { status: 201 });
  } catch (error) {
    console.error("Error creating podcast:", error);
    return NextResponse.json(
      { error: "Failed to create podcast" },
      { status: 500 },
    );
  }
}
