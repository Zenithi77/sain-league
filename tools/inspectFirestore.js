#!/usr/bin/env node
/** Snapshot of current Firestore contents relevant to seeding. */
const path = require("path");
const admin = require("firebase-admin");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});
const db = admin.firestore();

async function main() {
  const teams = await db.collection("teams").get();
  console.log(`teams: ${teams.size}`);
  teams.forEach((d) => {
    const t = d.data();
    console.log(
      `  ${d.id} | name="${t.name}" short="${t.shortName}" school="${t.school}" conf=${t.conference} stats=${JSON.stringify(t.stats)}`,
    );
  });

  const players = await db.collection("players").get();
  console.log(`\nplayers: ${players.size}`);
  players.docs.slice(0, 8).forEach((d) => {
    const p = d.data();
    console.log(
      `  ${d.id} | name="${p.name}" teamId=${p.teamId} num=${p.number} pos="${p.position}" h="${p.height}" image="${(p.image || "").slice(0, 60)}"`,
    );
  });

  const games = await db.collection("games").get();
  console.log(`\ngames: ${games.size}`);
  games.docs.slice(0, 5).forEach((d) => {
    const g = d.data();
    console.log(
      `  ${d.id} | ${g.date} home=${g.homeTeamId} ${g.homeScore} away=${g.awayTeamId} ${g.awayScore} status=${g.status}`,
    );
  });

  const seasons = await db.collection("seasons").get();
  console.log(`\nseasons: ${seasons.size}`);
  seasons.forEach((d) => console.log(`  ${d.id} | ${JSON.stringify(d.data())}`));

  const season = await db.collection("season").get();
  console.log(`\nseason (legacy collection): ${season.size}`);
  season.forEach((d) => console.log(`  ${d.id} | ${JSON.stringify(d.data()).slice(0, 200)}`));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
