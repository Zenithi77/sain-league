import { NextRequest, NextResponse } from "next/server";
import {
  readDatabase,
  writeDatabase,
  generateNewsId,
  getNewsArticles,
} from "@/lib/database";

// GET /api/news — get all news articles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const limit = parseInt(searchParams.get("limit") || "50");

    let articles = getNewsArticles();

    if (category) {
      articles = articles.filter((a) => a.category === category);
    }
    if (featured === "true") {
      articles = articles.filter((a) => a.featured);
    }

    return NextResponse.json(articles.slice(0, limit));
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}

// POST /api/news — create a news article
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, summary, content, image, category, teamIds, author, featured } = body;

    if (!title || !summary || !content) {
      return NextResponse.json(
        { error: "Title, summary, and content are required" },
        { status: 400 }
      );
    }

    const validCategories = ["highlight", "recap", "announcement", "interview", "transfer"];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    const db = readDatabase();
    if (!db.news) db.news = [];

    const newArticle = {
      id: generateNewsId(),
      title,
      summary,
      content,
      image: image || "",
      category: category || "announcement",
      teamIds: teamIds || [],
      author: author || "SGL Admin",
      date: new Date().toISOString().split("T")[0],
      featured: featured || false,
    };

    db.news.push(newArticle);
    writeDatabase(db);

    return NextResponse.json(newArticle, { status: 201 });
  } catch (error) {
    console.error("Error creating news:", error);
    return NextResponse.json(
      { error: "Failed to create news article" },
      { status: 500 }
    );
  }
}
