#!/usr/bin/env node
/**
 * seedFromExcel.js
 *
 * Seeds Firestore from "SGL Player Stats 2025–2026.xlsx" using ONLY:
 *   - sheet "SGLallplayersList"  -> `players` collection
 *   - sheet "FinalScores"        -> `games` collection (final scores only,
 *                                   no box scores) + recomputed team W/L
 *                                   records on the `teams` collection
 *
 * ── Sheet formats ──────────────────────────────────────────────────────────
 * SGLallplayersList: vertical list of team blocks. A team header row has the
 * same value merged across all columns (e.g. "16 Storm"). Below it, one row
 * per player: [name, height(cm), weight(kg), jersey #, -, DOB, position(MN)].
 * Many teams only have the name column filled — missing fields are left out.
 *
 * FinalScores: two independent column blocks — West ("Баруун", cols A-B) and
 * East ("Зүүн", cols E-F). Within a block: a date row (e.g. 2026.03.04) is
 * followed by team rows "teamLabel | finalScore"; consecutive team rows pair
 * up into games (first listed = home). A date may be followed by several
 * pairs (multiple games that day).
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *   node tools/seedFromExcel.js            # DRY RUN — parse + report only
 *   node tools/seedFromExcel.js --commit   # write players, games, team stats
 *
 * Re-runnable: document IDs are deterministic (hash of team+name / matchup),
 * so re-running updates the same docs instead of duplicating.
 */

const path = require("path");
const crypto = require("crypto");
const ExcelJS = require("exceljs");
const admin = require("firebase-admin");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const COMMIT = process.argv.includes("--commit");
const FILE = path.join(__dirname, "..", "SGL Player Stats 2025–2026.xlsx");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cellVal(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((r) => r.text).join("");
    if (v.text) return String(v.text);
    if (v.result !== undefined) return String(v.result);
    if (v instanceof Date) return v.toISOString().slice(0, 10).replace(/-/g, ".");
    return "";
  }
  return String(v);
}

function norm(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function md5(s) {
  return crypto.createHash("md5").update(s, "utf8").digest("hex").slice(0, 20);
}

// Mongolian position -> standard code
const POSITION_MAP = {
  "ХОЛБОГЧ": "PG",
  "ХАМГААЛАГЧ": "SG",
  "ДОВТЛОГЧ": "SF",
  "ХҮЧНИЙ ДОВТЛОГЧ": "PF",
  "ТӨВ": "C",
};

// "2011.03.16" -> { iso: "2011-03-16", age }
function parseDob(s) {
  const m = norm(s).match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const dob = new Date(iso);
  if (isNaN(dob)) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return { iso, age };
}

// Game-sheet dates, tolerant of the typos present in the sheet
// ("20226.03.05" -> 2026-03-05, "2026.0324" -> 2026-03-24).
function parseGameDate(s) {
  const t = norm(s);
  let m = t.match(/^(\d{4,5})\.(\d{1,2})\.(\d{1,2})$/);
  let y, mo, d;
  if (m) {
    y = m[1];
    mo = m[2];
    d = m[3];
    if (y.length === 5) y = y.slice(0, 2) + y.slice(3); // "20226" -> "2026"
  } else {
    m = t.match(/^(\d{4})\.(\d{2})(\d{2})$/); // "2026.0324"
    if (!m) return null;
    [, y, mo, d] = m;
  }
  const mi = parseInt(mo, 10);
  const di = parseInt(d, 10);
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return null;
  return `${y}-${String(mi).padStart(2, "0")}-${String(di).padStart(2, "0")}`;
}

function looksLikeDate(s) {
  return /^\d{4,5}\.\d{1,4}(\.\d{1,2})?$/.test(norm(s)) && norm(s).includes(".");
}

// ---------------------------------------------------------------------------
// Team resolution: sheet labels -> Firestore team docs
// Labels are either a school number ("33", "16 Storm", "117 Thunder") or a
// school name ("Эрхэт эрдэм", "Шинэ Монгол Atlanta", "Өнөр TST", "Амгалан Phoenix").
// ---------------------------------------------------------------------------
function buildTeamResolver(teams) {
  const byNumber = new Map(); // "16" -> team
  const byKeyword = []; // [keywordLower, team]

  for (const t of teams) {
    const school = norm(t.school);
    const numMatch = school.match(/^(\d+)/);
    if (numMatch) byNumber.set(numMatch[1], t);
    else byKeyword.push([school.toLowerCase(), t]);
  }

  // keyword aliases -> the school string they should resolve to
  const KEYWORDS = [
    ["эрхэт", "эрхэт"],
    ["шинэ монгол", "шинэ монгол"],
    ["өнөр", "өнөр"],
    ["үнүр", "өнөр"],
    ["амгалан", "амгалан"],
  ];

  return function resolveTeam(label) {
    const l = norm(label).toLowerCase();
    const numMatch = l.match(/^(\d+)/);
    if (numMatch && byNumber.has(numMatch[1])) return byNumber.get(numMatch[1]);
    for (const [alias, target] of KEYWORDS) {
      if (l.includes(alias)) {
        const hit = byKeyword.find(([school]) => school.includes(target));
        if (hit) return hit[1];
      }
    }
    return null;
  };
}

// ---------------------------------------------------------------------------
// Parse SGLallplayersList
// ---------------------------------------------------------------------------
function parsePlayers(ws, resolveTeam, warnings) {
  const players = [];
  let currentTeam = null;
  let currentLabel = "";

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const c = (i) => norm(cellVal(row.getCell(i)));
    const name = c(1);
    if (!name) continue;
    if (name.includes("SAIN LEAGUE")) continue;
    if (name === "овог нэр") continue; // column header row

    // Team header: merged cell repeats across the row
    if (name === c(2) && name === c(3)) {
      currentTeam = resolveTeam(name);
      currentLabel = name;
      if (!currentTeam) warnings.push(`r${r}: unresolved team header "${name}"`);
      continue;
    }

    if (!currentTeam) continue;

    const dob = parseDob(c(6));
    const number = parseInt(c(4), 10);
    players.push({
      teamId: currentTeam.id,
      teamLabel: currentLabel,
      name,
      height: c(2) || "",
      weight: c(3) || "",
      number: Number.isFinite(number) ? number : 0,
      position: POSITION_MAP[c(7).toUpperCase()] || "",
      dateOfBirth: dob ? dob.iso : "",
      age: dob ? dob.age : 0,
    });
  }
  return players;
}

// ---------------------------------------------------------------------------
// Parse FinalScores (two column blocks: West = cols 1-2, East = cols 5-6)
// ---------------------------------------------------------------------------
function parseGames(ws, resolveTeam, warnings) {
  const games = [];
  const blocks = [
    { name: "West", teamCol: 1, scoreCol: 2 },
    { name: "East", teamCol: 5, scoreCol: 6 },
  ];

  for (const block of blocks) {
    let currentDate = null;
    let pending = []; // [{label, score, row}]

    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const a = norm(cellVal(row.getCell(block.teamCol)));
      const b = norm(cellVal(row.getCell(block.scoreCol)));
      if (!a) continue;
      if (a.includes("SGL") || a === "Баруун" || a === "Зүүн") continue;

      if (looksLikeDate(a)) {
        if (pending.length) {
          warnings.push(
            `${block.name} r${r}: unpaired team row "${pending[0].label}" dropped before new date`,
          );
          pending = [];
        }
        currentDate = parseGameDate(a);
        if (!currentDate) warnings.push(`${block.name} r${r}: unparseable date "${a}"`);
        continue;
      }

      // team + score row
      const score = parseInt(b, 10);
      if (!Number.isFinite(score)) {
        warnings.push(`${block.name} r${r}: "${a}" has no score — skipped`);
        pending = [];
        continue;
      }
      pending.push({ label: a, score, row: r });

      if (pending.length === 2) {
        const [home, away] = pending;
        pending = [];
        if (!currentDate) {
          warnings.push(`${block.name} r${home.row}: game without a date — skipped`);
          continue;
        }
        const homeTeam = resolveTeam(home.label);
        const awayTeam = resolveTeam(away.label);
        if (!homeTeam || !awayTeam) {
          warnings.push(
            `${block.name} r${home.row}: unresolved team "${!homeTeam ? home.label : away.label}" — skipped`,
          );
          continue;
        }
        games.push({
          date: currentDate,
          conference: block.name.toLowerCase(),
          homeTeamId: homeTeam.id,
          homeLabel: home.label,
          homeScore: home.score,
          awayTeamId: awayTeam.id,
          awayLabel: away.label,
          awayScore: away.score,
        });
      }
    }
    if (pending.length) {
      warnings.push(`${block.name}: trailing unpaired team row "${pending[0].label}"`);
    }
  }
  return games;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n=== Seed from Excel ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===\n`);

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  const db = admin.firestore();

  const teamsSnap = await db.collection("teams").get();
  const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`Teams in Firestore: ${teams.length}`);
  const resolveTeam = buildTeamResolver(teams);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const warnings = [];

  // ---- players ----
  const players = parsePlayers(wb.getWorksheet("SGLallplayersList"), resolveTeam, warnings);
  const byTeam = new Map();
  players.forEach((p) => byTeam.set(p.teamLabel, (byTeam.get(p.teamLabel) || 0) + 1));
  console.log(`\nParsed players: ${players.length}`);
  for (const [label, count] of byTeam) {
    const full = players.filter((p) => p.teamLabel === label && p.height).length;
    console.log(`  ${label}: ${count} players (${full} with full bio data)`);
  }

  // ---- games ----
  const games = parseGames(wb.getWorksheet("FinalScores"), resolveTeam, warnings);
  console.log(`\nParsed games: ${games.length}`);
  for (const g of games) {
    console.log(
      `  ${g.date} [${g.conference}] ${g.homeLabel} ${g.homeScore} — ${g.awayScore} ${g.awayLabel}`,
    );
  }

  // ---- team records from final scores ----
  const records = new Map(
    teams.map((t) => [
      t.id,
      { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, gamesPlayed: 0 },
    ]),
  );
  for (const g of games) {
    const h = records.get(g.homeTeamId);
    const a = records.get(g.awayTeamId);
    h.gamesPlayed++;
    a.gamesPlayed++;
    h.pointsFor += g.homeScore;
    h.pointsAgainst += g.awayScore;
    a.pointsFor += g.awayScore;
    a.pointsAgainst += g.homeScore;
    if (g.homeScore > g.awayScore) {
      h.wins++;
      a.losses++;
    } else if (g.awayScore > g.homeScore) {
      a.wins++;
      h.losses++;
    }
  }
  console.log(`\nComputed team records (from final scores):`);
  for (const t of teams) {
    const r = records.get(t.id);
    console.log(
      `  ${norm(t.school).padEnd(22)} ${r.wins}W-${r.losses}L  GP=${r.gamesPlayed}  PF=${r.pointsFor} PA=${r.pointsAgainst}`,
    );
  }

  if (warnings.length) {
    console.log(`\nWARNINGS (${warnings.length}):`);
    warnings.forEach((w) => console.log("  ! " + w));
  }

  if (!COMMIT) {
    console.log("\nDry run only — nothing written. Re-run with --commit to apply.\n");
    return;
  }

  // ---- write ----
  console.log("\nWriting to Firestore...");
  const now = admin.firestore.FieldValue.serverTimestamp();
  const emptyStats = {
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
  };

  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops > 0) await batch.commit();
    batch = db.batch();
    ops = 0;
  };
  const queue = async (ref, data) => {
    batch.set(ref, data, { merge: true });
    if (++ops >= 400) await flush();
  };

  for (const p of players) {
    const id = "p_" + md5(`${p.teamId}|${p.name}`);
    await queue(db.collection("players").doc(id), {
      teamId: p.teamId,
      name: p.name,
      number: p.number,
      position: p.position,
      height: p.height,
      weight: p.weight,
      age: p.age,
      dateOfBirth: p.dateOfBirth,
      image: "",
      stats: emptyStats,
      seededFrom: "SGLallplayersList",
      updatedAt: now,
    });
  }
  console.log(`  players queued: ${players.length}`);

  const gameKeyCount = new Map();
  for (const g of games) {
    const key = `${g.date}|${g.homeTeamId}|${g.awayTeamId}`;
    const seq = gameKeyCount.get(key) || 0;
    gameKeyCount.set(key, seq + 1);
    const id = "g_" + md5(`${key}|${seq}`);
    await queue(db.collection("games").doc(id), {
      date: g.date,
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      status: "finished",
      playerStats: [],
      seededFrom: "FinalScores",
      updatedAt: now,
    });
  }
  console.log(`  games queued: ${games.length}`);

  for (const t of teams) {
    await queue(db.collection("teams").doc(t.id), {
      stats: records.get(t.id),
      updatedAt: now,
    });
  }
  console.log(`  team records queued: ${teams.length}`);

  await flush();
  console.log("\n✓ Done.\n");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("\nERROR:", e);
      process.exit(1);
    });
}

module.exports = { FILE, md5, buildTeamResolver, parsePlayers, parseGames };
