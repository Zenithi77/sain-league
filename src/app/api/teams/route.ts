import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebase-admin";
import {
  validateTeamInput,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  sanitizeString,
} from "@/lib/validation";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const TEAMS_COLLECTION = "teams";

export async function GET() {
  try {
    const teamsRef = collection(db, TEAMS_COLLECTION);
    const snapshot = await getDocs(teamsRef);
    const teams = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching teams from Firestore:", error);
    // Fallback to local database
    const { readDatabase, calculateTeamAverages } =
      await import("@/lib/database");
    const localDb = readDatabase();
    const teamsWithAverages = localDb.teams.map((team) =>
      calculateTeamAverages(team, localDb.players),
    );
    return NextResponse.json(teamsWithAverages);
  }
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

  try {
    const teamsRef = collection(db, TEAMS_COLLECTION);

    // Check if team with same name exists in Firestore
    const nameLower = (body.name as string).trim().toLowerCase();
    const nameQuery = query(teamsRef, where("nameLower", "==", nameLower));
    const nameSnapshot = await getDocs(nameQuery);
    if (!nameSnapshot.empty) {
      return validationErrorResponse([
        "Энэ нэртэй баг аль хэдийн бүртгэлтэй байна",
      ]);
    }

    // Check if team with same shortName exists
    const shortNameLower = (body.shortName as string).trim().toLowerCase();
    const shortNameQuery = query(
      teamsRef,
      where("shortNameLower", "==", shortNameLower),
    );
    const shortNameSnapshot = await getDocs(shortNameQuery);
    if (!shortNameSnapshot.empty) {
      return validationErrorResponse([
        "Энэ товчилсон нэртэй баг аль хэдийн бүртгэлтэй байна",
      ]);
    }

    const newTeamData = {
      name: sanitizeString(body.name) || "",
      nameLower,
      shortName: sanitizeString(body.shortName) || "",
      shortNameLower,
      logo: body.logo || "/assets/logos/default.png",
      city: sanitizeString(body.city) || "",
      conference: body.conference as "east" | "west",
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
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(teamsRef, newTeamData);
    const newTeam = { id: docRef.id, ...newTeamData };

    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error("Error creating team in Firestore:", error);
    return NextResponse.json(
      { error: "Баг үүсгэхэд алдаа гарлаа" },
      { status: 500 },
    );
  }
}
