import { NextResponse } from 'next/server';
import { readDatabase, writeDatabase, generateGameId } from '@/lib/database';

export async function GET() {
  const db = readDatabase();
  const gamesWithTeams = db.games.map((game) => {
    const homeTeam = db.teams.find((t) => t.id === game.homeTeamId);
    const awayTeam = db.teams.find((t) => t.id === game.awayTeamId);
    return {
      ...game,
      homeTeam: homeTeam || null,
      awayTeam: awayTeam || null,
    };
  });
  return NextResponse.json(gamesWithTeams);
}

export async function POST(request: Request) {
  const db = readDatabase();
  const body = await request.json();
  
  const newGame = {
    id: generateGameId(),
    date: body.date,
    homeTeamId: body.homeTeamId,
    awayTeamId: body.awayTeamId,
    homeScore: 0,
    awayScore: 0,
    status: 'scheduled' as const,
    playerStats: [],
  };
  
  db.games.push(newGame);
  writeDatabase(db);
  
  return NextResponse.json(newGame, { status: 201 });
}
