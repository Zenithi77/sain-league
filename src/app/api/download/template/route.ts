import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET() {
  const columns = [
    "PlayerName",
    "Team",
    "Number",
    "Position",
    "Minutes",
    "Points",
    "Rebounds",
    "Assists",
    "Steals",
    "Blocks",
    "Turnovers",
    "Fouls",
    "FGM",
    "FGA",
    "3PM",
    "3PA",
    "FTM",
    "FTA",
  ];

  const sampleRow = [
    "Sample Player",
    "UBW",
    23,
    "PG",
    32,
    18,
    5,
    8,
    2,
    1,
    3,
    2,
    7,
    14,
    2,
    5,
    2,
    3,
  ];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Game Stats");
  worksheet.columns = columns.map((header) => ({ header, key: header }));
  worksheet.addRow(sampleRow);

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": "attachment; filename=game_stats_template.xlsx",
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
