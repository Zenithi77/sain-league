import { NextResponse } from 'next/server';
import { readDatabase, writeDatabase, generatePlayerId } from '@/lib/database';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Check file type
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'xlsx' && ext !== 'xls') {
      return NextResponse.json({ error: 'Only Excel files allowed' }, { status: 400 });
    }
    
    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const db = readDatabase();
    let updatedPlayers = 0;
    const updatedTeams = new Set<string>();
    
    // Get game result from form data
    const homeTeamId = formData.get('homeTeamId') as string;
    const awayTeamId = formData.get('awayTeamId') as string;
    const homeScore = formData.get('homeScore') as string;
    const awayScore = formData.get('awayScore') as string;
    
    // Process each row from Excel
    data.forEach((row: any) => {
      const playerName = row.PlayerName || row['Player Name'] || row.Name;
      const teamShortName = row.TeamShortName || row['Team'] || row.Team;
      
      if (!playerName) return;
      
      // Find player
      let player = db.players.find((p) => p.name === playerName);
      
      // If player not found by name, try to find by team and create if needed
      if (!player && teamShortName) {
        const team = db.teams.find((t) => t.shortName === teamShortName);
        if (team) {
          // Create new player
          player = {
            id: generatePlayerId(),
            teamId: team.id,
            name: playerName,
            number: row.Number || 0,
            position: row.Position || 'Unknown',
            height: row.Height || 'N/A',
            weight: row.Weight || 'N/A',
            age: row.Age || 0,
            image: '/assets/players/default.png',
            stats: {
              gamesPlayed: 0,
              minutesPlayed: 0,
              totalPoints: 0,
              totalRebounds: 0,
              totalAssists: 0,
              totalSteals: 0,
              totalBlocks: 0,
              totalTurnovers: 0,
              totalFouls: 0,
              fieldGoalsMade: 0,
              fieldGoalsAttempted: 0,
              threePointersMade: 0,
              threePointersAttempted: 0,
              freeThrowsMade: 0,
              freeThrowsAttempted: 0,
            },
          };
          db.players.push(player);
        }
      }
      
      if (player) {
        // Update player stats
        player.stats.gamesPlayed += 1;
        player.stats.minutesPlayed += parseInt(row.Minutes || row.MIN || '0');
        player.stats.totalPoints += parseInt(row.Points || row.PTS || '0');
        player.stats.totalRebounds += parseInt(row.Rebounds || row.REB || '0');
        player.stats.totalAssists += parseInt(row.Assists || row.AST || '0');
        player.stats.totalSteals += parseInt(row.Steals || row.STL || '0');
        player.stats.totalBlocks += parseInt(row.Blocks || row.BLK || '0');
        player.stats.totalTurnovers += parseInt(row.Turnovers || row.TO || '0');
        player.stats.totalFouls += parseInt(row.Fouls || row.PF || '0');
        player.stats.fieldGoalsMade += parseInt(row.FGM || row['FG Made'] || '0');
        player.stats.fieldGoalsAttempted += parseInt(row.FGA || row['FG Attempted'] || '0');
        player.stats.threePointersMade += parseInt(row['3PM'] || row['3PT Made'] || '0');
        player.stats.threePointersAttempted += parseInt(row['3PA'] || row['3PT Attempted'] || '0');
        player.stats.freeThrowsMade += parseInt(row.FTM || row['FT Made'] || '0');
        player.stats.freeThrowsAttempted += parseInt(row.FTA || row['FT Attempted'] || '0');
        
        updatedPlayers++;
        updatedTeams.add(player.teamId);
      }
    });
    
    // Update team stats if game result is provided
    if (homeTeamId && awayTeamId && homeScore && awayScore) {
      const homeTeam = db.teams.find((t) => t.id === homeTeamId);
      const awayTeam = db.teams.find((t) => t.id === awayTeamId);
      
      if (homeTeam && awayTeam) {
        homeTeam.stats.gamesPlayed += 1;
        awayTeam.stats.gamesPlayed += 1;
        homeTeam.stats.pointsFor += parseInt(homeScore);
        homeTeam.stats.pointsAgainst += parseInt(awayScore);
        awayTeam.stats.pointsFor += parseInt(awayScore);
        awayTeam.stats.pointsAgainst += parseInt(homeScore);
        
        if (parseInt(homeScore) > parseInt(awayScore)) {
          homeTeam.stats.wins += 1;
          awayTeam.stats.losses += 1;
        } else {
          awayTeam.stats.wins += 1;
          homeTeam.stats.losses += 1;
        }
      }
    }
    
    writeDatabase(db);
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updatedPlayers} players from ${updatedTeams.size} teams`,
      updatedPlayers,
      teamsAffected: updatedTeams.size,
    });
  } catch (error: any) {
    console.error('Error processing Excel file:', error);
    return NextResponse.json(
      { error: 'Error processing file', details: error.message },
      { status: 500 }
    );
  }
}
