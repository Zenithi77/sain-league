#!/usr/bin/env node
/**
 * migrateDatabaseJsonToFirestore.js
 *
 * One-off migration script that reads the existing `data/database.json` file
 * and writes all seasons, teams, players, games and aggregate documents into
 * your Firestore database.
 *
 * After writing the raw data it calls the recomputeStandings / Leaderboards
 * logic to populate the cached docs the frontend reads.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *
 *   # 1. Install deps (root project already has firebase-admin)
 *   npm install   # or: npm install firebase-admin
 *
 *   # 2. Point to your service account key (production)
 *   set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccountKey.json
 *
 *   # 3. Run the script
 *   node tools/migrateDatabaseJsonToFirestore.js
 *
 *   # — OR for emulator testing ─────────────────────────────────────────
 *   set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
 *   node tools/migrateDatabaseJsonToFirestore.js
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// ---------------------------------------------------------------------------
// 1. Initialise Firebase Admin
// ---------------------------------------------------------------------------
if (!admin.apps.length) {
  // When GOOGLE_APPLICATION_CREDENTIALS is set, initializeApp() picks it up.
  // When FIRESTORE_EMULATOR_HOST is set, it connects to the local emulator.
  admin.initializeApp({
    projectId:
      process.env.GCLOUD_PROJECT ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      "sain-league",
  });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ---------------------------------------------------------------------------
// 2. Read database.json
// ---------------------------------------------------------------------------
const DB_PATH = path.resolve(__dirname, "..", "data", "database.json");

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌  database.json not found at ${DB_PATH}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
const { season, teams, players, games } = raw;

// ---------------------------------------------------------------------------
// 3. Helpers
// ---------------------------------------------------------------------------
const BATCH_LIMIT = 499; // Firestore batch limit (500 ops, keep 1 margin)

/**
 * Commit a batch when it hits the limit, then return a fresh batch.
 */
async function commitIfFull(batch, count) {
  if (count >= BATCH_LIMIT) {
    await batch.commit();
    return { batch: db.batch(), count: 0 };
  }
  return { batch, count };
}

// ---------------------------------------------------------------------------
// 4. Migration
// ---------------------------------------------------------------------------
async function migrate() {
  const seasonId = season.id; // e.g. "2026"
  console.log(`\n🏀  Migrating season "${season.name}" (${seasonId}) …\n`);

  let batch = db.batch();
  let opCount = 0;

  // ---- 4a. Season document ------------------------------------------------
  const seasonRef = db.doc(`seasons/${seasonId}`);
  batch.set(seasonRef, {
    name: season.name,
    year: season.year,
    startDate: season.startDate,
    endDate: season.endDate,
    isActive: season.isActive ?? true,
    createdAt: FieldValue.serverTimestamp(),
  });
  opCount++;

  // ---- 4b. Teams -----------------------------------------------------------
  const teamMap = new Map(); // id → team object (for later lookups)
  for (const team of teams) {
    teamMap.set(team.id, team);
    const ref = db.doc(`seasons/${seasonId}/teams/${team.id}`);
    batch.set(ref, {
      name: team.name,
      shortName: team.shortName,
      logo: team.logo || "",
      city: team.city || "",
      coach: team.coach || null,
      colors: team.colors || { primary: "#333", secondary: "#fff" },
      createdAt: FieldValue.serverTimestamp(),
    });
    opCount++;
    ({ batch, count: opCount } = await commitIfFull(batch, opCount));
  }
  console.log(`  ✅  ${teams.length} teams queued`);

  // ---- 4c. Players ---------------------------------------------------------
  for (const player of players) {
    const ref = db.doc(`seasons/${seasonId}/players/${player.id}`);
    batch.set(ref, {
      teamId: player.teamId,
      name: player.name,
      number: player.number,
      position: player.position,
      height: player.height || "",
      weight: player.weight || "",
      age: player.age || 0,
      image: player.image || "",
      createdAt: FieldValue.serverTimestamp(),
    });
    opCount++;
    ({ batch, count: opCount } = await commitIfFull(batch, opCount));
  }
  console.log(`  ✅  ${players.length} players queued`);

  // ---- 4d. Games -----------------------------------------------------------
  for (const game of games) {
    const ref = db.doc(`seasons/${seasonId}/games/${game.id}`);
    batch.set(ref, {
      date: game.date,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeScore: game.homeScore ?? 0,
      awayScore: game.awayScore ?? 0,
      status: game.status || "scheduled",
      createdAt: FieldValue.serverTimestamp(),
    });
    opCount++;
    ({ batch, count: opCount } = await commitIfFull(batch, opCount));

    // ---- 4d-i. Boxscores (embedded playerStats → subcollection) ------------
    if (Array.isArray(game.playerStats) && game.playerStats.length > 0) {
      for (const ps of game.playerStats) {
        const player = players.find((p) => p.id === ps.playerId);
        // Derive a stable boxscore doc ID: {teamId}__{playerName normalised}
        const teamId = player ? player.teamId : "unknown";
        const playerName = player ? player.name : ps.playerId;
        const boxId = `${teamId}__${playerName.toLowerCase().replace(/\s+/g, "_")}`;

        const boxRef = db.doc(
          `seasons/${seasonId}/games/${game.id}/boxscores/${boxId}`,
        );
        batch.set(boxRef, {
          teamId,
          playerName,
          jerseyNumber: player ? player.number : 0,
          minutes: ps.minutes ?? 0,
          points: ps.points ?? 0,
          rebounds: ps.rebounds ?? 0,
          assists: ps.assists ?? 0,
          steals: ps.steals ?? 0,
          blocks: ps.blocks ?? 0,
          turnovers: ps.turnovers ?? 0,
          fouls: ps.fouls ?? 0,
          fgMade: ps.fgMade ?? 0,
          fgAttempted: ps.fgAttempted ?? 0,
          threeMade: ps.threeMade ?? 0,
          threeAttempted: ps.threeAttempted ?? 0,
          ftMade: ps.ftMade ?? 0,
          ftAttempted: ps.ftAttempted ?? 0,
          createdAt: FieldValue.serverTimestamp(),
        });
        opCount++;
        ({ batch, count: opCount } = await commitIfFull(batch, opCount));
      }
      console.log(
        `    📋  ${game.id}: ${game.playerStats.length} boxscores queued`,
      );
    }
  }
  console.log(`  ✅  ${games.length} games queued`);

  // ---- 4e. Team aggregates (from team.stats in database.json) -------------
  for (const team of teams) {
    const s = team.stats || {};
    const ref = db.doc(`seasons/${seasonId}/teamAggregates/${team.id}`);
    batch.set(ref, {
      teamId: team.id,
      wins: s.wins ?? 0,
      losses: s.losses ?? 0,
      gamesPlayed: s.gamesPlayed ?? 0,
      pointsFor: s.pointsFor ?? 0,
      pointsAgainst: s.pointsAgainst ?? 0,
      // These aren't in database.json; integrity recompute fills them later
      homeWins: 0,
      homeLosses: 0,
      roadWins: 0,
      roadLosses: 0,
      recentResults: [],
      updatedAt: FieldValue.serverTimestamp(),
    });
    opCount++;
    ({ batch, count: opCount } = await commitIfFull(batch, opCount));
  }
  console.log(`  ✅  ${teams.length} team aggregates queued`);

  // ---- 4f. Player aggregates (from player.stats in database.json) ---------
  for (const player of players) {
    const s = player.stats || {};
    const playerId = player.id;
    const ref = db.doc(`seasons/${seasonId}/playerAggregates/${playerId}`);
    batch.set(ref, {
      playerId,
      teamId: player.teamId,
      playerName: player.name,
      jerseyNumber: player.number,
      gamesPlayed: s.gamesPlayed ?? 0,
      minutes: s.minutesPlayed ?? 0,
      points: s.totalPoints ?? 0,
      rebounds: s.totalRebounds ?? 0,
      assists: s.totalAssists ?? 0,
      steals: s.totalSteals ?? 0,
      blocks: s.totalBlocks ?? 0,
      turnovers: s.totalTurnovers ?? 0,
      fouls: s.totalFouls ?? 0,
      fgMade: s.fieldGoalsMade ?? 0,
      fgAttempted: s.fieldGoalsAttempted ?? 0,
      threeMade: s.threePointersMade ?? 0,
      threeAttempted: s.threePointersAttempted ?? 0,
      ftMade: s.freeThrowsMade ?? 0,
      ftAttempted: s.freeThrowsAttempted ?? 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
    opCount++;
    ({ batch, count: opCount } = await commitIfFull(batch, opCount));
  }
  console.log(`  ✅  ${players.length} player aggregates queued`);

  // ---- 4g. Final commit ----------------------------------------------------
  if (opCount > 0) {
    await batch.commit();
  }

  console.log(`\n✅  All documents written to Firestore.`);

  // ---- 5. Recompute cached standings & leaderboards -----------------------
  //
  // NOTE: The recompute functions live in the Cloud Functions code (TypeScript,
  // compiled to functions/lib/).  For simplicity we replicate a lightweight
  // version here that writes the cached standings doc directly.  After deploy
  // you should also call the HTTP endpoints /recomputeStandings and
  // /recomputeLeaderboards to get the full enhanced standings.
  //
  console.log(`\n📊  Building initial standings cache …`);
  await buildInitialStandingsCache(seasonId);

  console.log(`\n🎉  Migration complete!  Next steps:`);
  console.log(`   1. Deploy functions: firebase deploy --only functions`);
  console.log(
    `   2. Call recomputeStandings & recomputeLeaderboards to get full enhanced data`,
  );
  console.log(
    `   3. Or run the nightly integrityRecompute function to rebuild everything\n`,
  );
}

// ---------------------------------------------------------------------------
// 5. Lightweight standings cache builder
// ---------------------------------------------------------------------------
async function buildInitialStandingsCache(seasonId) {
  const aggSnap = await db
    .collection(`seasons/${seasonId}/teamAggregates`)
    .get();
  if (aggSnap.empty) {
    console.log("  ⚠️  No team aggregates found, skipping cache.");
    return;
  }

  const rows = [];
  for (const doc of aggSnap.docs) {
    const d = doc.data();
    const w = d.wins || 0;
    const l = d.losses || 0;
    const gp = w + l;
    rows.push({
      teamId: doc.id,
      wins: w,
      losses: l,
      pct: gp > 0 ? w / gp : 0,
      pointsFor: d.pointsFor || 0,
      pointsAgainst: d.pointsAgainst || 0,
      diff: (d.pointsFor || 0) - (d.pointsAgainst || 0),
      gamesPlayed: d.gamesPlayed || gp,
      home: `${d.homeWins || 0}-${d.homeLosses || 0}`,
      road: `${d.roadWins || 0}-${d.roadLosses || 0}`,
      streak: "-",
      l10: "-",
      gb: 0,
      rank: 0,
    });
  }

  // Sort by pct desc, then diff desc
  rows.sort((a, b) => b.pct - a.pct || b.diff - a.diff);

  // Compute GB relative to leader
  const leaderW = rows[0]?.wins ?? 0;
  const leaderL = rows[0]?.losses ?? 0;
  rows.forEach((r, i) => {
    r.rank = i + 1;
    r.gb = (leaderW - r.wins + (r.losses - leaderL)) / 2;
  });

  // Write cache doc
  const cachePath = `seasons/${seasonId}/cached/standings`;
  await db.doc(cachePath).set({
    seasonId,
    standings: rows,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`  ✅  Standings cache written (${rows.length} teams)`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
migrate().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
