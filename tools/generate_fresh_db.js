// Generate fresh database.json with correct UTF-8 Mongolian text
const fs = require('fs');
const path = require('path');

const teams = [
  // ===== WEST CONFERENCE =====
  { id: "team-001", name: "33 Sparks", shortName: "SPK", logo: "/assets/logos/sparks.png", city: "Улаанбаатар", conference: "west", school: "33-р сургууль" },
  { id: "team-002", name: "Emura Team", shortName: "EMR", logo: "/assets/logos/emura.png", city: "Улаанбаатар", conference: "west", school: "Эрхэт Эрдэм сургууль" },
  { id: "team-003", name: "Storm Team", shortName: "STM", logo: "/assets/logos/storm.png", city: "Улаанбаатар", conference: "west", school: "16-р сургууль" },
  { id: "team-004", name: "Hawks", shortName: "HWK", logo: "/assets/logos/hawks.png", city: "Улаанбаатар", conference: "west", school: "52-р сургууль" },
  { id: "team-005", name: "Bunny", shortName: "BNY", logo: "/assets/logos/bunny.png", city: "Улаанбаатар", conference: "west", school: "141-р сургууль" },
  { id: "team-006", name: "Shine Mongol Atlanta", shortName: "SMA", logo: "/assets/logos/atlanta.png", city: "Улаанбаатар", conference: "west", school: "Шинэ Монгол сургууль" },
  { id: "team-007", name: "Shooting Stars", shortName: "STS", logo: "/assets/logos/shootingstars.png", city: "Улаанбаатар", conference: "west", school: "84-р сургууль" },
  { id: "team-008", name: "Altan Od", shortName: "AOD", logo: "/assets/logos/altanod.png", city: "Улаанбаатар", conference: "west", school: "3-р сургууль" },

  // ===== EAST CONFERENCE =====
  { id: "team-009", name: "School's Devils", shortName: "DVL", logo: "/assets/logos/devils.png", city: "Улаанбаатар", conference: "east", school: "31-р сургууль" },
  { id: "team-010", name: "TST Unur", shortName: "TST", logo: "/assets/logos/unur.png", city: "Улаанбаатар", conference: "east", school: "Үнүр сургууль" },
  { id: "team-011", name: "Tugs Shonhoruud", shortName: "TSH", logo: "/assets/logos/shonhoruud.png", city: "Улаанбаатар", conference: "east", school: "1-р сургууль" },
  { id: "team-012", name: "Phoenix Amgalan", shortName: "PHX", logo: "/assets/logos/phoenix.png", city: "Улаанбаатар", conference: "east", school: "Амгалан сургууль" },
  { id: "team-013", name: "21 Wolves", shortName: "WLV", logo: "/assets/logos/wolves.png", city: "Улаанбаатар", conference: "east", school: "21-р сургууль" },
  { id: "team-014", name: "Thunder", shortName: "THD", logo: "/assets/logos/thunder.png", city: "Улаанбаатар", conference: "east", school: "117-р сургууль" },
  { id: "team-015", name: "Royal Dunk", shortName: "RDK", logo: "/assets/logos/royaldunk.png", city: "Улаанбаатар", conference: "east", school: "151-р сургууль" },
  { id: "team-016", name: "Irvesuud", shortName: "IRV", logo: "/assets/logos/irvesuud.png", city: "Улаанбаатар", conference: "east", school: "93-р сургууль" },
];

const teamColors = [
  { primary: "#F15F22", secondary: "#1A1A2E" },
  { primary: "#2E86AB", secondary: "#FFFFFF" },
  { primary: "#457B9D", secondary: "#A8DADC" },
  { primary: "#9B2335", secondary: "#D4AF37" },
  { primary: "#FF69B4", secondary: "#FFFFFF" },
  { primary: "#E63946", secondary: "#F1FAEE" },
  { primary: "#FFD700", secondary: "#00008B" },
  { primary: "#CD853F", secondary: "#4169E1" },
  { primary: "#DC143C", secondary: "#000000" },
  { primary: "#008080", secondary: "#FFE4B5" },
  { primary: "#4682B4", secondary: "#F0E68C" },
  { primary: "#FF9F1C", secondary: "#2C3E50" },
  { primary: "#6C5B7B", secondary: "#C06C84" },
  { primary: "#355E3B", secondary: "#C19A6B" },
  { primary: "#2F4F4F", secondary: "#FF69B4" },
  { primary: "#8B4513", secondary: "#228B22" },
];

// Sample player names per team (one per team)
const samplePlayers = [
  { name: "Анужин Бат-Эрдэнэ", number: 7, position: "PG", height: "165 см", weight: "55 кг", age: 16 },
  { name: "Сарангоо Мөнхбат", number: 11, position: "SG", height: "168 см", weight: "57 кг", age: 17 },
  { name: "Номин-Эрдэнэ Ганбаатар", number: 5, position: "SF", height: "172 см", weight: "60 кг", age: 16 },
  { name: "Оюунтуяа Батсүх", number: 10, position: "PF", height: "175 см", weight: "62 кг", age: 17 },
  { name: "Энхжин Дорж", number: 3, position: "PG", height: "163 см", weight: "52 кг", age: 15 },
  { name: "Солонго Нямдорж", number: 14, position: "C", height: "178 см", weight: "65 кг", age: 17 },
  { name: "Мөнхзул Эрдэнэбат", number: 8, position: "SG", height: "167 см", weight: "56 кг", age: 16 },
  { name: "Нарангоо Баярсайхан", number: 22, position: "SF", height: "170 см", weight: "58 кг", age: 16 },
  { name: "Цэнгэл Ганзориг", number: 4, position: "PG", height: "164 см", weight: "53 кг", age: 15 },
  { name: "Болормаа Энхтүвшин", number: 15, position: "PF", height: "174 см", weight: "61 кг", age: 17 },
  { name: "Хулан Батболд", number: 9, position: "SG", height: "166 см", weight: "55 кг", age: 16 },
  { name: "Одгэрэл Мягмарсүрэн", number: 12, position: "C", height: "177 см", weight: "64 кг", age: 17 },
  { name: "Ану Ганбат", number: 6, position: "SF", height: "169 см", weight: "57 кг", age: 16 },
  { name: "Сувд Батчулуун", number: 20, position: "PG", height: "162 см", weight: "51 кг", age: 15 },
  { name: "Оюунбилэг Эрдэнэ", number: 13, position: "PF", height: "173 см", weight: "60 кг", age: 16 },
  { name: "Ариунзаяа Түмэнбаяр", number: 2, position: "SG", height: "165 см", weight: "54 кг", age: 16 },
];

const emptyStats = {
  gamesPlayed: 0, minutesPlayed: 0, totalPoints: 0, totalRebounds: 0,
  totalAssists: 0, totalSteals: 0, totalBlocks: 0, totalTurnovers: 0,
  totalFouls: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0,
  threePointersMade: 0, threePointersAttempted: 0,
  freeThrowsMade: 0, freeThrowsAttempted: 0
};

const teamStats = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, gamesPlayed: 0 };

const fullTeams = teams.map((t, i) => ({
  ...t,
  coach: { id: `coach-${String(i+1).padStart(3,'0')}`, name: "", image: "/assets/coaches/default.png" },
  colors: teamColors[i],
  stats: { ...teamStats }
}));

const players = samplePlayers.map((p, i) => ({
  id: `p-${String(i+1).padStart(3,'0')}`,
  teamId: teams[i].id,
  ...p,
  image: "",
  country: "Монгол",
  college: "-",
  stats: { ...emptyStats }
}));

const database = {
  season: {
    id: "2026",
    name: "Sain Girls League 2026",
    year: 2026,
    startDate: "2026-01-15",
    endDate: "2026-06-30",
    isActive: true
  },
  teams: fullTeams,
  players: players,
  games: [],
  news: []
};

const outPath = path.join(__dirname, '..', 'data', 'database.json');
fs.writeFileSync(outPath, JSON.stringify(database, null, 4), 'utf8');

console.log('=== Teams ===');
fullTeams.forEach(t => console.log(`  ${t.id}: ${t.name} | ${t.school} (${t.conference})`));
console.log(`\n=== Players (${players.length}) ===`);
players.forEach(p => console.log(`  ${p.name} - ${p.position} - ${p.teamId}`));
console.log('\nDone!');
