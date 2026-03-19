import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { readDatabase } from "@/lib/database";
import { v4 as uuidv4 } from "uuid";

// GET /api/news — get all news articles (from local database.json)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const db = readDatabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let articles: any[] = (db.news || [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    // Filter by status
    if (status) {
      articles = articles.filter((a) => a.status === status);
    }
    if (category) {
      articles = articles.filter((a) => a.category === category);
    }
    if (featured === "true") {
      articles = articles.filter((a) => a.featured);
    }

    // Resolve team data from local DB
    const teamsMap = new Map(db.teams.map((t) => [t.id, t]));

    const articlesWithTeams = articles.map((article) => ({
      ...article,
      teams: (article.teamIds || [])
        .map((tid: string) => teamsMap.get(tid))
        .filter(Boolean),
    }));

    return NextResponse.json(articlesWithTeams);
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/news — create a news article
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      summary,
      contentHtml,
      coverImage,
      category,
      teamIds,
      author,
      featured,
      status,
    } = body;

    if (!title || !summary || !contentHtml) {
      return NextResponse.json(
        { error: "Title, summary, and contentHtml are required" },
        { status: 400 },
      );
    }

    const validCategories = [
      "highlight",
      "recap",
      "announcement",
      "interview",
      "transfer",
    ];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const id = `news-${uuidv4().slice(0, 8)}`;
    const newArticle = {
      id,
      status: status || "draft",
      title,
      summary,
      contentHtml,
      coverImage: coverImage || "",
      category: category || "announcement",
      teamIds: teamIds || [],
      author: author || "SGL Admin",
      date: new Date().toISOString().split("T")[0],
      featured: featured || false,
    };

    const db = getAdminFirestore();
    await db.collection("news").doc(id).set(newArticle);

    return NextResponse.json(newArticle, { status: 201 });
  } catch (error) {
    console.error("Error creating news:", error);
    return NextResponse.json(
      { error: "Failed to create news article" },
      { status: 500 },
    );
  }
}
