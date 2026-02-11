import { NextResponse } from 'next/server';
import { readDatabase, calculatePlayerAverages } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: { category: string } }
) {
  const db = readDatabase();
  const category = params.category;
  
  const validCategories = [
    'points',
    'rebounds',
    'assists',
    'steals',
    'blocks',
    'fgPercentage',
    '3ptPercentage',
    'ftPercentage',
  ];
  
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  
  const playersWithAverages = db.players.map((player) => {
    const p = calculatePlayerAverages(player);
    const team = db.teams.find((t) => t.id === player.teamId);
    return {
      ...p,
      teamName: team ? team.name : 'Unknown',
      teamShortName: team ? team.shortName : '???',
    };
  });
  
  let sortedPlayers;
  switch (category) {
    case 'points':
      sortedPlayers = playersWithAverages.sort(
        (a, b) => parseFloat(b.averages.pointsPerGame) - parseFloat(a.averages.pointsPerGame)
      );
      break;
    case 'rebounds':
      sortedPlayers = playersWithAverages.sort(
        (a, b) => parseFloat(b.averages.reboundsPerGame) - parseFloat(a.averages.reboundsPerGame)
      );
      break;
    case 'assists':
      sortedPlayers = playersWithAverages.sort(
        (a, b) => parseFloat(b.averages.assistsPerGame) - parseFloat(a.averages.assistsPerGame)
      );
      break;
    case 'steals':
      sortedPlayers = playersWithAverages.sort(
        (a, b) => parseFloat(b.averages.stealsPerGame) - parseFloat(a.averages.stealsPerGame)
      );
      break;
    case 'blocks':
      sortedPlayers = playersWithAverages.sort(
        (a, b) => parseFloat(b.averages.blocksPerGame) - parseFloat(a.averages.blocksPerGame)
      );
      break;
    case 'fgPercentage':
      sortedPlayers = playersWithAverages.sort(
        (a, b) =>
          parseFloat(b.averages.fieldGoalPercentage) - parseFloat(a.averages.fieldGoalPercentage)
      );
      break;
    case '3ptPercentage':
      sortedPlayers = playersWithAverages.sort(
        (a, b) =>
          parseFloat(b.averages.threePointPercentage) - parseFloat(a.averages.threePointPercentage)
      );
      break;
    case 'ftPercentage':
      sortedPlayers = playersWithAverages.sort(
        (a, b) =>
          parseFloat(b.averages.freeThrowPercentage) - parseFloat(a.averages.freeThrowPercentage)
      );
      break;
    default:
      sortedPlayers = playersWithAverages;
  }
  
  const rankings = sortedPlayers.slice(0, 20).map((player, index) => ({
    ...player,
    rank: index + 1,
  }));
  
  return NextResponse.json(rankings);
}
