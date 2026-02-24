import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, imageUrl } = body;

    if (!type || !id || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = readDatabase();

    if (type === 'player') {
      const player = db.players.find(p => p.id === id);
      if (!player) {
        return NextResponse.json(
          { error: 'Player not found' },
          { status: 404 }
        );
      }
      player.image = imageUrl;
    } else if (type === 'team') {
      const team = db.teams.find(t => t.id === id);
      if (!team) {
        return NextResponse.json(
          { error: 'Team not found' },
          { status: 404 }
        );
      }
      team.logo = imageUrl;
    } else {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      );
    }

    if (writeDatabase(db)) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to save database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
