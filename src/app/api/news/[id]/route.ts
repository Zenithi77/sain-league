import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/firebase-admin";

const NEWS_COLLECTION = "news";

// GET /api/news/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection(NEWS_COLLECTION).doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const article = { id: docSnap.id, ...docSnap.data() };

    // Resolve teams
    const teamIds = (article as any).teamIds || [];
    const teams: any[] = [];
    for (const tid of teamIds) {
      const teamDoc = await db.collection("teams").doc(tid).get();
      if (teamDoc.exists) {
        teams.push({ id: teamDoc.id, ...teamDoc.data() });
      }
    }

    return NextResponse.json({ ...article, teams });
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 },
    );
  }
}

// DELETE /api/news/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();
    const docRef = db.collection(NEWS_COLLECTION).doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 },
    );
  }
}

// PUT /api/news/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const db = getAdminFirestore();
    const docRef = db.collection(NEWS_COLLECTION).doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Don't allow overwriting the id
    delete body.id;
    await docRef.update(body);

    const updated = await docRef.get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 },
    );
  }
}

// PATCH /api/news/[id] — partial update (e.g. status change)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const db = getAdminFirestore();
    const docRef = db.collection(NEWS_COLLECTION).doc(params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    delete body.id;
    await docRef.update(body);

    const updated = await docRef.get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 },
    );
  }
}
