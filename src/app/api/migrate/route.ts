import { NextResponse } from 'next/server';
import { readDatabase } from '@/lib/database';
import { 
  doc, 
  setDoc, 
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    // Read existing data from database.json
    const data = readDatabase();
    
    const results = {
      teams: 0,
      players: 0,
      games: 0,
      season: false,
    };

    // Migrate Teams
    if (data.teams && data.teams.length > 0) {
      const batch = writeBatch(db);
      data.teams.forEach((team) => {
        const teamRef = doc(db, 'teams', team.id);
        batch.set(teamRef, team);
        results.teams++;
      });
      await batch.commit();
    }

    // Migrate Players
    if (data.players && data.players.length > 0) {
      // Split into batches of 500 (Firestore limit)
      const batchSize = 500;
      for (let i = 0; i < data.players.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = data.players.slice(i, i + batchSize);
        chunk.forEach((player) => {
          const playerRef = doc(db, 'players', player.id);
          batch.set(playerRef, player);
          results.players++;
        });
        await batch.commit();
      }
    }

    // Migrate Games
    if (data.games && data.games.length > 0) {
      const batch = writeBatch(db);
      data.games.forEach((game) => {
        const gameRef = doc(db, 'games', game.id);
        batch.set(gameRef, game);
        results.games++;
      });
      await batch.commit();
    }

    // Migrate Season
    if (data.season) {
      const seasonRef = doc(db, 'season', 'current');
      await setDoc(seasonRef, data.season);
      results.season = true;
    }

    return NextResponse.json({
      success: true,
      message: 'Data migration completed successfully',
      results,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed: ' + error.message },
      { status: 500 }
    );
  }
}
