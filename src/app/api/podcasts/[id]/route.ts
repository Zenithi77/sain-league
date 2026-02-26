import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

const COLLECTION = "podcasts";

// GET /api/podcasts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection(COLLECTION).doc(params.id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Podcast not found" }, { status: 404 });
    }
    return NextResponse.json({ id: snapshot.id, ...snapshot.data() });
  } catch (error) {
    console.error("Error fetching podcast:", error);
    return NextResponse.json(
      { error: "Failed to fetch podcast" },
      { status: 500 },
    );
  }
}

// PUT /api/podcasts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const db = getAdminFirestore();
    const docRef = db.collection(COLLECTION).doc(params.id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Podcast not found" }, { status: 404 });
    }

    const { id, ...updateData } = body;
    await docRef.update(updateData);

    const updated = await docRef.get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Error updating podcast:", error);
    return NextResponse.json(
      { error: "Failed to update podcast" },
      { status: 500 },
    );
  }
}

// DELETE /api/podcasts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection(COLLECTION).doc(params.id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Podcast not found" }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting podcast:", error);
    return NextResponse.json(
      { error: "Failed to delete podcast" },
      { status: 500 },
    );
  }
}
