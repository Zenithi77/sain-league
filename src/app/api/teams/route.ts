import { NextResponse } from 'next/server';
import { readDatabase, calculateTeamAverages } from '@/lib/database';

export async function GET() {
  const db = readDatabase();
  const teamsWithAverages = db.teams.map((team) =>
    calculateTeamAverages(team, db.players)
  );
  return NextResponse.json(teamsWithAverages);
}

export async function POST(request: Request) {
  const { readDatabase, writeDatabase, generateTeamId } = await import('@/lib/database');
  
  const db = readDatabase();
  const body = await request.json();
  
  const newTeam = {
    id: generateTeamId(),
    name: body.name,
    shortName: body.shortName,
    logo: body.logo || '/assets/logos/default.png',
    city: body.city,
    coach: {
      id: `coach-${Date.now()}`,
      name: body.coachName || '',
      image: '/assets/coaches/default.png',
    },
    colors: {
      primary: body.primaryColor || '#FF6B35',
      secondary: body.secondaryColor || '#1A1A2E',
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
