import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";

// GET /api/news — get all news articles from Firestore
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const db = getAdminFirestore();

    const snapshot = await db.collection("news").get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let articles: any[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter in JS to avoid composite index requirements
    if (status) {
      articles = articles.filter((a) => a.status === status);
    }
    if (category) {
      articles = articles.filter((a) => a.category === category);
    }
    if (featured === "true") {
      articles = articles.filter((a) => a.featured);
    }

    // Sort by date descending, then limit
    articles.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    articles = articles.slice(0, limit);

    // Resolve team data
    const teamIds = new Set<string>();
    for (const article of articles) {
      for (const tid of (article as any).teamIds || []) {
        teamIds.add(tid);
      }
    }

    const teamsMap = new Map<string, any>();
    if (teamIds.size > 0) {
      const teamChunks: string[][] = [];
      const ids = Array.from(teamIds);
      for (let i = 0; i < ids.length; i += 10) {
        teamChunks.push(ids.slice(i, i + 10));
      }
      for (const chunk of teamChunks) {
        const teamSnap = await db
          .collection("teams")
          .where("__name__", "in", chunk)
          .get();
        teamSnap.docs.forEach((d) =>
          teamsMap.set(d.id, { id: d.id, ...d.data() }),
        );
      }
    }

    const articlesWithTeams = articles.map((article: any) => ({
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
