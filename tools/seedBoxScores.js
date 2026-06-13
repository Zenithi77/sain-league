#!/usr/bin/env node
/**
 * seedBoxScores.js
 *
 * Seeds per-player season aggregates from the workbook's "Player of the week"
 * sheet (partial box scores) into `seasons/{seasonId}/playerAggregates/{playerId}`,
 * which is exactly what the Stats page (usePlayerAggregates) and the player
 * detail / players-list pages (getPlayersWithAveragesFromFirestore) read to
 * compute per-game averages.
 *
 * ── Sheet format ("Player of the week", 9 cols) ─────────────────────────────
 *   GAME_DATE | SCHOOL | TEAM | PLAYER_NAME | PTS | REB | AST | STL | BLK
 *
 * Quirks handled:
 *   - GAME_DATE is sparse (only the first row of a block) and sometimes junk
 *     ("cc", "Game 1", "2026.04.06-12"). We don't need it — each data row is
 *     one recorded appearance, so a player's gamesPlayed = number of rows.
 *   - SCHOOL is sometimes blank but TEAM (nickname) is present; if both are
 *     blank we carry forward the previous block's team.
 *   - Stat cells use "-", "–" or blank for zero.
 *   - PLAYER_NAME is Cyrillic with inconsistent casing/spacing/initials and
 *     occasional spelling variants — matched to the seeded roster (scoped to
 *     the resolved team) by canonicalization + edit distance, same approach
 *     as tools/uploadPlayerPhotos.js.
 *
 * ── Averages semantics ──────────────────────────────────────────────────────
 *   These are PARTIAL stats (weekly standouts, not every box score), so a
 *   player's average = (sum over recorded rows) / (number of recorded rows).
 *   Shooting splits (FG/3P/FT) and minutes/turnovers/fouls are not in this
 *   sheet, so they are written as 0.
 *
 * Usage:
 *   node tools/seedBoxScores.js            # DRY RUN — parse, match, report
 *   node tools/seedBoxScores.js --commit   # clear + write playerAggregates
 */

const path = require("path");
const ExcelJS = require("exceljs");
const admin = require("firebase-admin");
const seed = require("./seedFromExcel"); // FILE, buildTeamResolver
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const COMMIT = process.argv.includes("--commit");
const SHEET = "Player of the week";

// ---------------------------------------------------------------------------
// Cell + name helpers
// ---------------------------------------------------------------------------
function cellVal(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((r) => r.text).join("");
    if (v.text) return String(v.text);
    if (v.result !== undefined) return String(v.result);
    return "";
  }
  return String(v);
}
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

function stat(cell) {
  const t = norm(cellVal(cell));
  if (t === "" || t === "-" || t === "–" || t === "—") return 0;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : 0;
}

// Cyrillic -> canonical latin, collapsing ambiguous letters so spelling
// variants converge (о/ө/у/ү -> o, х -> h, ц -> c, ч -> q, ш -> x, soft signs dropped).
const CYR = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "o", ж: "j", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", ө: "o", п: "p",
  р: "r", с: "s", т: "t", у: "o", ү: "o", ф: "f", х: "h", ц: "c", ч: "q",
  ш: "x", щ: "x", ъ: "", ы: "i", ь: "", э: "e", ю: "o", я: "a",
};
function canon(s) {
  let out = "";
  for (const ch of String(s).toLowerCase()) {
    if (CYR[ch] !== undefined) out += CYR[ch];
    else if (/[a-z]/.test(ch)) out += ch;
  }
  return out;
}
// "Б. Анхгэрэл" -> { initial: "б", given: "Анхгэрэл" }; "Бөртэжингоо" -> { initial:"", given:"Бөртэжингоо" }
function splitName(name) {
  const m = norm(name).match(/^(\p{L})\s*\.\s*(.+)$/u);
  if (m) return { initial: m[1].toLowerCase(), given: m[2].trim() };
  return { initial: "", given: norm(name) };
}
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return dp[a.length][b.length];
}

// TEAM-column nickname -> a school key the team resolver understands.
const TEAM_NICK = [
  [/алтан\s*од|алтан/i, "3"],
  [/сторм|storm/i, "16"],
  [/спаркс|sparks/i, "33"],
  [/атланта|atlanta/i, "шинэ монгол"],
  [/харцагууд|hawks/i, "52"],
  [/рояал|royal|данк|dunk/i, "151"],
  [/wolves|волвес/i, "21"],
  [/phoenix|финикс|феникс/i, "амгалан"],
  [/thunder/i, "117"],
  [/эмүра|эмура|emura/i, "эрхэт"],
  [/devils/i, "31"],
  [/shooting/i, "84"],
  [/ирвэс/i, "93"],
  [/шонхор|төгс/i, "1"],
  [/tst|тst/i, "өнөр"],
  [/банни|bunny/i, "141"],
];
function nickToKey(team) {
  for (const [re, key] of TEAM_NICK) if (re.test(team)) return key;
  return null;
}

// ---------------------------------------------------------------------------
// Player matcher (scoped to a team)
// ---------------------------------------------------------------------------
function makeMatcher(playersByTeam) {
  return function match(teamId, sheetName) {
    const roster = playersByTeam.get(teamId) || [];
    if (!roster.length) return { player: null, reason: "empty roster" };
    const s = splitName(sheetName);
    const sg = canon(s.given);
    if (!sg) return { player: null, reason: "empty name" };

    const scored = roster
      .map((p) => {
        const r = splitName(p.name);
        const rg = canon(r.given);
        const dGiven = editDistance(sg, rg);
        const dFull = editDistance(canon(s.initial + s.given), canon(r.initial + r.given));
        let base = Math.min(dGiven, dFull);
        // truncated given name ("Үлэмж" for "Үлэмжин"): treat a clean prefix
        // (shorter side >= 4 chars) as a near-exact match
        const isPrefix =
          (rg.startsWith(sg) || sg.startsWith(rg)) && Math.min(sg.length, rg.length) >= 4;
        if (isPrefix) base = Math.min(base, 0.5);
        // tie-break: when both sides have an initial, reward a matching one
        const initPenalty =
          s.initial && r.initial && canon(s.initial) !== canon(r.initial) ? 0.5 : 0;
        return { p, base, score: base + initPenalty };
      })
      .sort((a, b) => a.score - b.score);

    const best = scored[0];
    const second = scored[1];
    const maxDist = sg.length <= 5 ? 1 : 2;
    const ambiguous =
      best.base > 0 && second && Math.abs(second.score - best.score) < 0.75;
    if (best.base > maxDist || ambiguous) {
      return {
        player: null,
        reason: `closest: ${scored.slice(0, 3).map((c) => `${c.p.name}(${c.score})`).join(", ")}`,
      };
    }
    return { player: best.p, dist: best.score };
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n=== Seed box scores ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===\n`);

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  const db = admin.firestore();

  const seasonSnap = await db.collection("seasons").where("isActive", "==", true).get();
  if (seasonSnap.empty) throw new Error("No active season");
  const seasonId = seasonSnap.docs[0].id;
  console.log(`Active season: ${seasonId}`);

  const teamsSnap = await db.collection("teams").get();
  const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const resolveTeam = seed.buildTeamResolver(teams);
  const resolveKey = (key) => resolveTeam(key); // resolver takes a label/number/keyword

  const playersSnap = await db.collection("players").get();
  const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const playersByTeam = new Map();
  for (const p of players) {
    if (!playersByTeam.has(p.teamId)) playersByTeam.set(p.teamId, []);
    playersByTeam.get(p.teamId).push(p);
  }
  const match = makeMatcher(playersByTeam);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(seed.FILE);
  const ws = wb.getWorksheet(SHEET);
  if (!ws) throw new Error(`sheet "${SHEET}" not found`);

  // playerId -> aggregate accumulator
  const agg = new Map();
  const get = (p) => {
    if (!agg.has(p.id)) {
      agg.set(p.id, {
        player: p,
        gamesPlayed: 0,
        points: 0,
        totalRebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
      });
    }
    return agg.get(p.id);
  };

  let lastTeamId = null;
  let dataRows = 0;
  const unresolvedTeam = [];
  const unmatched = [];
  let skippedNoName = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const school = norm(cellVal(row.getCell(2)));
    const teamNick = norm(cellVal(row.getCell(3)));
    const name = norm(cellVal(row.getCell(4)));

    // Resolve team for this row (and remember it for blank continuation rows)
    let team = null;
    if (school) team = resolveKey(school);
    if (!team && teamNick) {
      const key = nickToKey(teamNick);
      if (key) team = resolveKey(key);
    }
    if (team) lastTeamId = team.id;
    else if (!school && !teamNick) team = teams.find((t) => t.id === lastTeamId) || null;

    if (!name) {
      // header continuation / empty stat row — nothing to record
      continue;
    }
    dataRows++;

    if (!team) {
      unresolvedTeam.push(`r${r}: name="${name}" school="${school}" team="${teamNick}"`);
      continue;
    }

    const res = match(team.id, name);
    if (!res.player) {
      unmatched.push(`r${r}: "${name}" @ ${norm(team.school)} — ${res.reason}`);
      continue;
    }

    const a = get(res.player);
    a.gamesPlayed++;
    a.points += stat(row.getCell(5));
    a.totalRebounds += stat(row.getCell(6));
    a.assists += stat(row.getCell(7));
    a.steals += stat(row.getCell(8));
    a.blocks += stat(row.getCell(9));
  }

  // ---- report ----
  const rows = [...agg.values()].sort(
    (a, b) => b.points / b.gamesPlayed - a.points / a.gamesPlayed,
  );
  console.log(`\nData rows: ${dataRows}`);
  console.log(`Matched players: ${rows.length}`);
  console.log(`Unmatched name rows: ${unmatched.length}`);
  console.log(`Unresolved-team rows: ${unresolvedTeam.length}\n`);

  console.log("Top 15 by PPG (G = recorded games):");
  console.log("  player                         team   G   PTS  REB  AST  STL  BLK   PPG");
  for (const a of rows.slice(0, 15)) {
    const t = teams.find((t) => t.id === a.player.teamId);
    const g = a.gamesPlayed || 1;
    console.log(
      `  ${String(a.player.name).padEnd(28)} ${String(t && t.shortName || "").padEnd(5)} ${String(a.gamesPlayed).padStart(2)}  ${String(a.points).padStart(4)} ${String(a.totalRebounds).padStart(4)} ${String(a.assists).padStart(4)} ${String(a.steals).padStart(4)} ${String(a.blocks).padStart(4)}  ${(a.points / g).toFixed(1).padStart(5)}`,
    );
  }

  if (unmatched.length) {
    console.log(`\nUNMATCHED name rows (${unmatched.length}):`);
    unmatched.forEach((u) => console.log("  ? " + u));
  }
  if (unresolvedTeam.length) {
    console.log(`\nUNRESOLVED-TEAM rows (${unresolvedTeam.length}):`);
    unresolvedTeam.forEach((u) => console.log("  ! " + u));
  }

  if (!COMMIT) {
    console.log("\nDry run only — nothing written. Re-run with --commit to apply.\n");
    return;
  }

  // ---- write: clear derived collection, then write fresh ----
  console.log("\nClearing existing playerAggregates...");
  const existing = await db.collection(`seasons/${seasonId}/playerAggregates`).get();
  {
    let b = db.batch();
    let n = 0;
    for (const d of existing.docs) {
      b.delete(d.ref);
      if (++n >= 400) {
        await b.commit();
        b = db.batch();
        n = 0;
      }
    }
    if (n) await b.commit();
  }
  console.log(`  deleted ${existing.size} docs`);

  console.log("Writing playerAggregates...");
  const now = admin.firestore.FieldValue.serverTimestamp();
  let batch = db.batch();
  let ops = 0;
  for (const a of rows) {
    const p = a.player;
    const ref = db.doc(`seasons/${seasonId}/playerAggregates/${p.id}`);
    batch.set(ref, {
      playerId: p.id,
      teamId: p.teamId,
      playerName: p.name,
      jerseyNumber: Number(p.number) || 0,
      gamesPlayed: a.gamesPlayed,
      minutesPlayed: 0,
      points: a.points,
      totalRebounds: a.totalRebounds,
      assists: a.assists,
      steals: a.steals,
      blocks: a.blocks,
      turnovers: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      threePointFieldGoalsMade: 0,
      threePointFieldGoalsAttempted: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      personalFoulsCommitted: 0,
      seededFrom: "PlayerOfTheWeek",
      updatedAt: now,
    });
    if (++ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops) await batch.commit();
  console.log(`\n✓ Wrote ${rows.length} playerAggregates for season ${seasonId}.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nERROR:", e);
    process.exit(1);
  });
