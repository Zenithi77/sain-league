import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  const templateData = [
    {
      PlayerName: 'Sample Player',
      Team: 'UBW',
      Number: 23,
      Position: 'PG',
      Minutes: 32,
      Points: 18,
      Rebounds: 5,
      Assists: 8,
      Steals: 2,
      Blocks: 1,
      Turnovers: 3,
      Fouls: 2,
      FGM: 7,
      FGA: 14,
      '3PM': 2,
      '3PA': 5,
      FTM: 2,
      FTA: 3,
    },
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Game Stats');
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': 'attachment; filename=game_stats_template.xlsx',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
}
