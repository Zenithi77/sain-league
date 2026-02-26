import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/firebase-admin";

const CONFIG_COLLECTION = "config";
const CATEGORIES_DOC = "newsCategories";

// Default categories
const DEFAULT_CATEGORIES: Record<string, string> = {
  highlight: "Тоглолтын тойм",
  recap: "Тоглолтын дүн",
  announcement: "Мэдээлэл",
  interview: "Ярилцлага",
  transfer: "Шилжилт",
};

// GET /api/news/categories — get all news categories
export async function GET() {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection(CONFIG_COLLECTION).doc(CATEGORIES_DOC);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      // Seed defaults
      await docRef.set({ categories: DEFAULT_CATEGORIES });
      return NextResponse.json({ categories: DEFAULT_CATEGORIES });
    }

    return NextResponse.json({
      categories: docSnap.data()?.categories || DEFAULT_CATEGORIES,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// PUT /api/news/categories — overwrite all news categories
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { categories } = body;

    if (!categories || typeof categories !== "object") {
      return NextResponse.json(
        { error: "categories object is required" },
        { status: 400 },
      );
    }

    const db = getAdminFirestore();
    await db
      .collection(CONFIG_COLLECTION)
      .doc(CATEGORIES_DOC)
      .set({ categories });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error updating categories:", error);
    return NextResponse.json(
      { error: "Failed to update categories" },
      { status: 500 },
    );
  }
}
