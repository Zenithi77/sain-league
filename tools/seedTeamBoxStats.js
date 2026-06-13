#!/usr/bin/env node
/**
 * seedTeamBoxStats.js
 *
 * Fills the offensive box-score fields the Stats page "Teams" tab reads from
 * `seasons/{seasonId}/teamAggregates` — `points`, `totalRebounds`, `assists`,
 * `steals`, `blocks` — which seedStandings.js did not populate (it only wrote
 * wins/losses/pointsFor/pointsAgainst). The page shows `field / gamesPlayed`.
 *
 * Sources:
 *   - `points`  = the team's real `pointsFor` (sum of final scores) ⇒ accurate
 *                 team points-per-game.
 *   - `totalRebounds / assists / steals / blocks` = summed from this team's
 *                 player box scores in `playerAggregates` (seeded from the
 *                 partial "Player of the week" sheet). These are the only
 *                 box-score numbers available, so the rate stats are a
 *                 lower-bound (real GP denominator, partial counting stats).
 *
 * Idempotent: merges the fields onto existing teamAggregates docs.
 *
 *   node tools/seedTeamBoxStats.js            # DRY RUN — report only
 *   node tools/seedTeamBoxStats.js --commit   # write fields
 */

const path = require("path");
const admin = require("firebase-admin");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const COMMIT = process.argv.includes("--commit");

async function main() {
  console.log(`\n=== Seed team box stats ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===\n`);

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
  const teamName = new Map(teamsSnap.docs.map((d) => [d.id, d.data().shortName || d.id]));

  // Roll up player box scores per team
  const paSnap = await db.collection(`seasons/${seasonId}/playerAggregates`).get();
  const roll = new Map(); // teamId -> {reb, ast, stl, blk}
  paSnap.forEach((d) => {
    const p = d.data();
    const r = roll.get(p.teamId) || { reb: 0, ast: 0, stl: 0, blk: 0 };
    r.reb += Number(p.totalRebounds ?? 0);
    r.ast += Number(p.assists ?? 0);
    r.stl += Number(p.steals ?? 0);
    r.blk += Number(p.blocks ?? 0);
    roll.set(p.teamId, r);
  });

  const taSnap = await db.collection(`seasons/${seasonId}/teamAggregates`).get();
  if (taSnap.empty) throw new Error("No teamAggregates — run tools/seedStandings.js --commit first");

  console.log(
    "team   GP  PF   PPG    REB  AST  STL  BLK   (per game)",
  );
  const updates = [];
  taSnap.forEach((d) => {
    const t = d.data();
    const gp = Number(t.gamesPlayed ?? 0) || 1;
    const pf = Number(t.pointsFor ?? 0);
    const r = roll.get(d.id) || { reb: 0, ast: 0, stl: 0, blk: 0 };
    updates.push({ id: d.id, points: pf, ...r, gp });
    console.log(
      `${String(teamName.get(d.id)).padEnd(5)} ${String(t.gamesPlayed ?? 0).padStart(3)} ${String(pf).padStart(4)} ${(pf / gp).toFixed(1).padStart(5)}   ${String(r.reb).padStart(4)} ${String(r.ast).padStart(4)} ${String(r.stl).padStart(4)} ${String(r.blk).padStart(4)}   ${(r.reb / gp).toFixed(1)}/${(r.ast / gp).toFixed(1)}/${(r.stl / gp).toFixed(1)}/${(r.blk / gp).toFixed(1)}`,
    );
  });

  if (!COMMIT) {
    console.log("\nDry run only — nothing written. Re-run with --commit to apply.\n");
    return;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  for (const u of updates) {
    batch.set(
      db.doc(`seasons/${seasonId}/teamAggregates/${u.id}`),
      {
        points: u.points,
        totalRebounds: u.reb,
        assists: u.ast,
        steals: u.stl,
        blocks: u.blk,
        updatedAt: now,
      },
      { merge: true },
    );
  }
  await batch.commit();
  console.log(`\n✓ Patched ${updates.length} teamAggregates with box-score fields.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nERROR:", e);
    process.exit(1);
  });
