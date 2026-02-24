import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebase-admin";
import {
  readDatabase,
  writeDatabase,
  calculateTeamAverages,
} from "@/lib/database";
import {
  validateTeamInput,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  sanitizeString,
} from "@/lib/validation";

export async function GET() {
  const db = readDatabase();
  const teamsWithAverages = db.teams.map((team) =>
    calculateTeamAverages(team, db.players),
  );
  return NextResponse.json(teamsWithAverages);
}

export async function POST(request: Request) {
  // Authentication check - admin only
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return auth.error?.includes("Админ")
      ? forbiddenResponse(auth.error)
      : unauthorizedResponse(auth.error);
  }

  // Parse and validate input
  let body: any;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse(["Буруу JSON формат"]);
  }

  const validation = validateTeamInput(body);
  if (!validation.valid) {
    return validationErrorResponse(validation.errors);
  }

  const db = readDatabase();

  // Check if team with same name exists
  const nameLower = (body.name as string).trim().toLowerCase();
  if (db.teams.some((t) => t.name.toLowerCase() === nameLower)) {
    return validationErrorResponse([
      "Энэ нэртэй баг аль хэдийн бүртгэлтэй байна",
    ]);
  }

  // Check if team with same shortName exists
  const shortNameLower = (body.shortName as string).trim().toLowerCase();
  if (db.teams.some((t) => t.shortName.toLowerCase() === shortNameLower)) {
    return validationErrorResponse([
      "Энэ товчилсон нэртэй баг аль хэдийн бүртгэлтэй байна",
    ]);
  }

  // Generate a new team ID
  const maxNum = db.teams.reduce((max, t) => {
    const match = t.id.match(/^team-(\d+)$/);
    return match ? Math.max(max, parseInt(match[1])) : max;
  }, 0);
  const newId = `team-${String(maxNum + 1).padStart(3, "0")}`;

  const newTeam = {
    id: newId,
    name: sanitizeString(body.name) || "",
    shortName: sanitizeString(body.shortName) || "",
    logo: body.logo || "/assets/logos/default.png",
    city: sanitizeString(body.city) || "",
    conference: (body.conference as "east" | "west") || "east",
    school: sanitizeString(body.school) || "",
    coach: {
      id: `coach-${Date.now()}`,
      name: sanitizeString(body.coachName) || "",
      image: "/assets/coaches/default.png",
    },
    colors: {
      primary: body.primaryColor || "#FF6B35",
      secondary: body.secondaryColor || "#1A1A2E",
    },
    stats: {
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      gamesPlayed: 0,
    },
  };

  db.teams.push(newTeam);
  writeDatabase(db);

  return NextResponse.json(newTeam, { status: 201 });
}
