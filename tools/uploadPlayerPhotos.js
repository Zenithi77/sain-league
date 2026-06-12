#!/usr/bin/env node
/**
 * uploadPlayerPhotos.js
 *
 * Matches photos in /AllPlayersProfilePhotos to player docs in Firestore,
 * uploads them to Firebase Storage (player-photos/) and sets `player.image`.
 *
 * File name format: {SchoolToken}_{PlayerFirstName}.JPEG
 *   - SchoolToken: school number ("117", "33", ...) or name
 *     ("Amgalan", "ErkhetErdem", "ShineMongol", "Unur")
 *   - PlayerFirstName: Latin transliteration of the player's Mongolian
 *     given name (occasionally prefixed with the initial, e.g. "KhUrangoo")
 *   - Unrenamed camera files ("ETA12345.JPEG") and duplicates ("...(1).JPEG")
 *     are skipped.
 *
 * Matching: both the Latin file name and the Cyrillic player name are reduced
 * to a canonical form (transliteration + collapsing of ambiguous letters like
 * о/ө/у/ү -> o, х/kh -> h), then compared exactly or by edit distance.
 *
 * Usage:
 *   node tools/uploadPlayerPhotos.js               # DRY RUN — show matches only
 *   node tools/uploadPlayerPhotos.js --from-excel  # DRY RUN against the Excel
 *                                                  # roster (works before seeding)
 *   node tools/uploadPlayerPhotos.js --commit      # upload + update players
 *
 * Run --commit AFTER tools/seedFromExcel.js --commit so the player docs exist.
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const ExcelJS = require("exceljs");
const seed = require("./seedFromExcel");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const COMMIT = process.argv.includes("--commit");
const FROM_EXCEL = process.argv.includes("--from-excel") && !COMMIT;
const PHOTO_DIR = path.join(__dirname, "..", "AllPlayersProfilePhotos");

// School token in the file name -> matcher against team.school in Firestore
const SCHOOL_TOKENS = {
  amgalan: "амгалан",
  erkheterdem: "эрхэт",
  shinemongol: "шинэ монгол",
  unur: "өнөр",
};

// ---------------------------------------------------------------------------
// Canonical name form. Cyrillic and Latin transliterations of the same
// Mongolian name must collapse to the same string (or nearly — small edit
// distances are tolerated).
// ---------------------------------------------------------------------------
const CYR = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "o", ж: "j", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", ө: "o", п: "p",
  р: "r", с: "s", т: "t", у: "o", ү: "o", ф: "f", х: "h", ц: "c", ч: "q",
  ш: "x", щ: "x", ъ: "", ы: "i", ь: "", э: "e", ю: "o", я: "a",
};

function canonCyrillic(s) {
  let out = "";
  for (const ch of s.toLowerCase()) {
    if (CYR[ch] !== undefined) out += CYR[ch];
    else if (/[a-z]/.test(ch)) out += ch;
  }
  return out;
}

function canonLatin(s) {
  let t = s.toLowerCase().replace(/[^a-z]/g, "");
  t = t
    .replace(/kh/g, "h")
    .replace(/ts/g, "c")
    .replace(/ch/g, "q")
    .replace(/sh/g, "x")
    .replace(/y/g, "")
    .replace(/u/g, "o");
  return t;
}

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

// "Б. Анхгэрэл" -> { initial: "б", given: "Анхгэрэл" }
function splitPlayerName(name) {
  const m = name.match(/^(\p{L})\s*\.\s*(.+)$/u);
  if (m) return { initial: m[1].toLowerCase(), given: m[2].trim() };
  return { initial: "", given: name.trim() };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n=== Player photos ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===\n`);

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${serviceAccount.project_id}.firebasestorage.app`;
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
    storageBucket: bucketName,
  });
  const db = admin.firestore();
  const bucket = admin.storage().bucket(bucketName);

  const teamsSnap = await db.collection("teams").get();
  const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let players;
  if (FROM_EXCEL) {
    // Preview mode: match against the Excel roster (same deterministic doc
    // IDs the seed script will create), so this works before seeding.
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(seed.FILE);
    const resolveTeam = seed.buildTeamResolver(teams);
    players = seed
      .parsePlayers(wb.getWorksheet("SGLallplayersList"), resolveTeam, [])
      .map((p) => ({
        docId: "p_" + seed.md5(`${p.teamId}|${p.name}`),
        teamId: p.teamId,
        name: p.name,
      }));
    console.log("(--from-excel: matching against Excel roster, not Firestore)");
  } else {
    const playersSnap = await db.collection("players").get();
    players = playersSnap.docs.map((d) => ({ docId: d.id, ...d.data() }));
  }
  console.log(`Teams: ${teams.length}, players: ${players.length}`);

  function resolveTeamByToken(token) {
    const t = token.toLowerCase();
    const num = t.match(/^\d+$/);
    if (num) {
      return teams.find((tm) => {
        const m = String(tm.school || "").trim().match(/^(\d+)/);
        return m && m[1] === t;
      });
    }
    const target = SCHOOL_TOKENS[t];
    if (!target) return null;
    return teams.find((tm) =>
      String(tm.school || "").toLowerCase().includes(target),
    );
  }

  const files = fs.readdirSync(PHOTO_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
  const skipped = [];
  const unmatched = [];
  const matches = []; // {file, player, dist}
  const usedPlayers = new Map(); // docId -> file (avoid two photos on one player)

  for (const file of files) {
    const base = file.replace(/\.[^.]+$/, "");
    if (/^ETA\d+$/i.test(base)) {
      skipped.push(`${file} (unrenamed camera file)`);
      continue;
    }
    if (/\(\d+\)$/.test(base)) {
      skipped.push(`${file} (duplicate "(n)" file)`);
      continue;
    }
    const idx = base.indexOf("_");
    if (idx < 0) {
      skipped.push(`${file} (no "_" separator)`);
      continue;
    }
    const schoolToken = base.slice(0, idx).trim();
    const firstName = base.slice(idx + 1).trim();
    if (!firstName) {
      skipped.push(`${file} (empty player name)`);
      continue;
    }
    const team = resolveTeamByToken(schoolToken);
    if (!team) {
      unmatched.push(`${file} — unknown school token "${schoolToken}"`);
      continue;
    }

    const target = canonLatin(firstName);
    const candidates = players
      .filter((p) => p.teamId === team.id)
      .map((p) => {
        const { initial, given } = splitPlayerName(p.name);
        const forms = [canonCyrillic(given)];
        if (initial) forms.push(canonCyrillic(initial) + canonCyrillic(given));
        const dist = Math.min(...forms.map((f) => editDistance(target, f)));
        return { p, dist };
      })
      .sort((x, y) => x.dist - y.dist);

    const best = candidates[0];
    const second = candidates[1];
    const maxDist = target.length <= 5 ? 1 : 2;
    const ambiguous = best && second && second.dist === best.dist && best.dist > 0;

    if (!best || best.dist > maxDist || ambiguous) {
      const near = candidates
        .slice(0, 3)
        .map((c) => `${c.p.name} (d=${c.dist})`)
        .join(", ");
      unmatched.push(`${file} — no confident match in "${team.school}". Closest: ${near}`);
      continue;
    }
    if (usedPlayers.has(best.p.docId)) {
      unmatched.push(
        `${file} — player "${best.p.name}" already matched to ${usedPlayers.get(best.p.docId)}`,
      );
      continue;
    }
    usedPlayers.set(best.p.docId, file);
    matches.push({ file, team, player: best.p, dist: best.dist });
  }

  console.log(`\nMATCHED: ${matches.length}`);
  for (const m of matches) {
    console.log(
      `  ${m.file.padEnd(34)} -> ${String(m.team.school).padEnd(20)} ${m.player.name} (d=${m.dist})`,
    );
  }
  if (unmatched.length) {
    console.log(`\nUNMATCHED: ${unmatched.length}`);
    unmatched.forEach((u) => console.log("  ? " + u));
  }
  if (skipped.length) {
    console.log(`\nSKIPPED: ${skipped.length}`);
    skipped.forEach((s) => console.log("  - " + s));
  }

  if (!COMMIT) {
    console.log("\nDry run only — nothing uploaded. Re-run with --commit to apply.\n");
    return;
  }

  console.log("\nUploading...");
  for (const m of matches) {
    const ext = m.file.split(".").pop().toLowerCase() === "png" ? "png" : "jpeg";
    const dest = `player-photos/${m.player.docId}.${ext}`;
    await bucket.upload(path.join(PHOTO_DIR, m.file), {
      destination: dest,
      metadata: {
        contentType: ext === "png" ? "image/png" : "image/jpeg",
        cacheControl: "public, max-age=31536000",
      },
    });
    await bucket.file(dest).makePublic();
    const url = `https://storage.googleapis.com/${bucket.name}/${dest}`;
    await db.collection("players").doc(m.player.docId).update({
      image: url,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ ${m.file} -> ${dest}`);
  }
  console.log(`\n✓ Uploaded ${matches.length} photos.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nERROR:", e);
    process.exit(1);
  });
