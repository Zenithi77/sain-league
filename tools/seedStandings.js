#!/usr/bin/env node
/**
 * seedStandings.js
 *
 * Builds the standings data the /standings page reads, from the finished
 * games in the `games` collection (seeded from the workbook's FinalScores):
 *
 *   1. `seasons/{seasonId}/teamAggregates/{teamId}` — wins/losses, points,
 *      home/road splits, recentResults (newest first). Same shape the
 *      cloud functions (recomputeCache.ts) consume.
 *   2. `seasons/{seasonId}/cached/standings` — the standings table document,
 *      mirroring functions/src/recomputeCache.ts#recomputeStandings.
 *
 * Usage:
 *   node tools/seedStandings.js            # DRY RUN — print table only
 *   node tools/seedStandings.js --commit   # write aggregates + cache doc
 */

const path = require("path");
const admin = require("firebase-admin");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const COMMIT = process.argv.includes("--commit");

async function main() {
  console.log(`\n=== Seed standings ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===\n`);

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  const db = admin.firestore();

  // Active season
  const seasonSnap = await db
    .collection("seasons")
    .where("isActive", "==", true)
    .get();
  if (seasonSnap.empty) throw new Error("No active season found");
  const seasonId = seasonSnap.docs[0].id;
  console.log(`Active season: ${seasonId} (${seasonSnap.docs[0].data().name})`);

  const teamsSnap = await db.collection("teams").get();
  const teams = new Map(teamsSnap.docs.map((d) => [d.id, d.data()]));

  const gamesSnap = await db.collection("games").get();
  const games = gamesSnap.docs
    .map((d) => d.data())
    .filter((g) => g.status === "finished")
    .sort((a, b) => String(a.date).localeCompare(String(b.date))); // oldest first
  console.log(`Finished games: ${games.length}\n`);

  // ---- per-team aggregates ----
  const agg = new Map();
  const blank = () => ({
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    homeWins: 0,
    homeLosses: 0,
    roadWins: 0,
    roadLosses: 0,
    results: [], // oldest first; reversed to newest-first at the end
  });
  const get = (id) => {
    if (!agg.has(id)) agg.set(id, blank());
    return agg.get(id);
  };

  for (const g of games) {
    const home = get(g.homeTeamId);
    const away = get(g.awayTeamId);
    const homeWon = g.homeScore > g.awayScore;

    home.gamesPlayed++;
    away.gamesPlayed++;
    home.pointsFor += g.homeScore;
    home.pointsAgainst += g.awayScore;
    away.pointsFor += g.awayScore;
    away.pointsAgainst += g.homeScore;

    if (homeWon) {
      home.wins++;
      home.homeWins++;
      away.losses++;
      away.roadLosses++;
    } else {
      away.wins++;
      away.roadWins++;
      home.losses++;
      home.homeLosses++;
    }
    home.results.push({ result: homeWon ? "W" : "L", date: g.date });
    away.results.push({ result: homeWon ? "L" : "W", date: g.date });
  }

  // ---- standings table (same logic as recomputeStandings cloud function) ----
  const wl = (w, l) => `${w}-${l}`;
  const raw = [...agg.entries()].map(([teamId, t]) => {
    const recent = [...t.results].reverse(); // newest first
    let streak = "-";
    if (recent.length) {
      const first = recent[0].result;
      let count = 0;
      for (const r of recent) {
        if (r.result === first) count++;
        else break;
      }
      streak = `${first}${count}`;
    }
    const last10 = recent.slice(0, 10);
    return {
      teamId,
      ...t,
      recentResults: recent,
      pct: t.wins + t.losses > 0 ? t.wins / (t.wins + t.losses) : 0,
      diff: t.pointsFor - t.pointsAgainst,
      streak,
      l10: wl(
        last10.filter((r) => r.result === "W").length,
        last10.filter((r) => r.result === "L").length,
      ),
    };
  });

  raw.sort((a, b) => (b.pct !== a.pct ? b.pct - a.pct : b.diff - a.diff));
  const leader = raw[0];
  const standings = raw.map((t, idx) => ({
    rank: idx + 1,
    teamId: t.teamId,
    wins: t.wins,
    losses: t.losses,
    pct: Math.round(t.pct * 1000) / 1000,
    gb: Math.max(
      idx === 0 ? 0 : (leader.wins - t.wins + (t.losses - leader.losses)) / 2,
      0,
    ),
    pointsFor: t.pointsFor,
    pointsAgainst: t.pointsAgainst,
    diff: t.diff,
    home: wl(t.homeWins, t.homeLosses),
    road: wl(t.roadWins, t.roadLosses),
    streak: t.streak,
    l10: t.l10,
    gamesPlayed: t.gamesPlayed,
  }));

  console.log(
    "rank  team                    conf  W-L    pct    gb   home  road  strk  l10",
  );
  for (const s of standings) {
    const t = teams.get(s.teamId) || {};
    console.log(
      `${String(s.rank).padStart(3)}   ${String(t.school || s.teamId).padEnd(22)} ${String(t.conference || "?").padEnd(5)} ${wl(s.wins, s.losses).padEnd(6)} ${s.pct.toFixed(3)}  ${String(s.gb).padStart(4)}  ${s.home.padEnd(5)} ${s.road.padEnd(5)} ${s.streak.padEnd(5)} ${s.l10}`,
    );
  }

  if (!COMMIT) {
    console.log("\nDry run only — nothing written. Re-run with --commit to apply.\n");
    return;
  }

  console.log("\nWriting to Firestore...");
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  for (const t of raw) {
    batch.set(
      db.doc(`seasons/${seasonId}/teamAggregates/${t.teamId}`),
      {
        teamId: t.teamId,
        wins: t.wins,
        losses: t.losses,
        gamesPlayed: t.gamesPlayed,
        pointsFor: t.pointsFor,
        pointsAgainst: t.pointsAgainst,
        homeWins: t.homeWins,
        homeLosses: t.homeLosses,
        roadWins: t.roadWins,
        roadLosses: t.roadLosses,
        recentResults: t.recentResults,
        seededFrom: "FinalScores",
        updatedAt: now,
      },
      { merge: true },
    );
  }
  batch.set(db.doc(`seasons/${seasonId}/cached/standings`), {
    seasonId,
    standings,
    updatedAt: now,
  });

  await batch.commit();
  console.log(
    `✓ Wrote ${raw.length} teamAggregates + cached/standings for season ${seasonId}.\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nERROR:", e);
    process.exit(1);
  });
