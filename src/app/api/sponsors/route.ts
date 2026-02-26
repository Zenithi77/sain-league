import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

const COLLECTION = "sponsors";

// GET /api/sponsors — get all sponsors
export async function GET() {
  try {
    const db = getAdminFirestore();
    let sponsors;
    try {
      const snapshot = await db
        .collection(COLLECTION)
        .orderBy("order", "asc")
        .get();
      sponsors = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch {
      const snapshot = await db.collection(COLLECTION).get();
      sponsors = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    return NextResponse.json(sponsors);
  } catch (error) {
    console.error("Error fetching sponsors:", error);
    return NextResponse.json(
      { error: "Failed to fetch sponsors" },
      { status: 500 },
    );
  }
}

// POST /api/sponsors — create a sponsor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, logo, website, order } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 },
      );
    }

    const db = getAdminFirestore();
    const docRef = db.collection(COLLECTION).doc();

    const newSponsor = {
      name,
      logo: logo || "",
      website: website || "",
      order: order ?? 0,
      createdAt: new Date().toISOString(),
    };

    await docRef.set(newSponsor);

    return NextResponse.json({ id: docRef.id, ...newSponsor }, { status: 201 });
  } catch (error) {
    console.error("Error creating sponsor:", error);
    return NextResponse.json(
      { error: "Failed to create sponsor" },
      { status: 500 },
    );
  }
}
