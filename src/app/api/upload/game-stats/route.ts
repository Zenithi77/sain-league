import { NextResponse } from 'next/server';
import { readDatabase, writeDatabase, generatePlayerId } from '@/lib/database';
import { requireAdmin } from '@/lib/firebase-admin';
import { unauthorizedResponse, forbiddenResponse, errorResponse } from '@/lib/validation';
import * as XLSX from 'xlsx';

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types for Excel files
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/octet-stream', // Sometimes files are sent as this
];

export async function POST(request: Request) {
  // Authentication check - admin only
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return auth.error?.includes('Админ') 
      ? forbiddenResponse(auth.error) 
      : unauthorizedResponse(auth.error);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return errorResponse('Файл оруулна уу', 400);
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('Файлын хэмжээ 5MB-с хэтрэхгүй байх ёстой', 400);
    }
    
    // Check file extension
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'xlsx' && ext !== 'xls') {
      return errorResponse('Зөвхөн Excel файл (.xlsx, .xls) зөвшөөрөгдөнө', 400);
    }

    // Check MIME type (additional security layer)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      console.warn(`Suspicious MIME type: ${file.type} for file: ${file.name}`);
      // Allow but log - some systems don't report correct MIME types
    }
    
    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Validate Excel file magic bytes (PK signature for xlsx or D0 CF for xls)
    const header = buffer.slice(0, 4);
    const isValidExcel = 
      (header[0] === 0x50 && header[1] === 0x4B) || // PK for ZIP/XLSX
      (header[0] === 0xD0 && header[1] === 0xCF);   // OLE for XLS
    
    if (!isValidExcel) {
      return errorResponse('Буруу файл формат - зөвхөн Excel файл зөвшөөрөгдөнө', 400);
    }

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
