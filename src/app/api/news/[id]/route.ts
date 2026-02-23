import { NextRequest, NextResponse } from "next/server";
import {
  readDatabase,
  writeDatabase,
  getNewsById,
} from "@/lib/database";

// GET /api/news/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = getNewsById(params.id);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    return NextResponse.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

// DELETE /api/news/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = readDatabase();
    const index = (db.news || []).findIndex((n) => n.id === params.id);
    if (index === -1) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    db.news.splice(index, 1);
    writeDatabase(db);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}

// PUT /api/news/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const db = readDatabase();
    const index = (db.news || []).findIndex((n) => n.id === params.id);
    if (index === -1) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    db.news[index] = { ...db.news[index], ...body, id: params.id };
    writeDatabase(db);
    return NextResponse.json(db.news[index]);
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}
