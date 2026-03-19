import { NextRequest, NextResponse } from "next/server";
import { readDatabase, writeDatabase } from "@/lib/database";
import { v4 as uuidv4 } from "uuid";

// GET /api/sponsors — get all sponsors (from local database.json)
export async function GET() {
  try {
    const db = readDatabase();
    const sponsors = (db.sponsors || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return NextResponse.json(sponsors);
  } catch (error) {
    console.error("Error fetching sponsors:", error);
    return NextResponse.json([], { status: 200 });
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

    const db = readDatabase();
    const newSponsor = {
      id: `sponsor-${uuidv4().slice(0, 8)}`,
      name,
      logo: logo || "",
      website: website || "",
      order: order ?? 0,
    };

    db.sponsors = [...(db.sponsors || []), newSponsor];
    writeDatabase(db);

    return NextResponse.json(newSponsor, { status: 201 });
  } catch (error) {
    console.error("Error creating sponsor:", error);
    return NextResponse.json(
      { error: "Failed to create sponsor" },
      { status: 500 },
    );
  }
}
