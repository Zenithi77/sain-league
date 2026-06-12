#!/usr/bin/env node
/**
 * uploadTeamLogosAndColors.js
 *
 * For every team in Firestore:
 *   1. Finds the matching logo in /TeamLogos (preferring .png over .jpeg/.jpg).
 *   2. Uploads it to Firebase Storage under `team-logos/` and makes it public.
 *   3. Extracts two representative brand colours from the logo image.
 *   4. Updates the team document's `logo`, `colors.primary` and
 *      `colors.secondary` fields.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *   node tools/uploadTeamLogosAndColors.js            # DRY RUN (no writes)
 *   node tools/uploadTeamLogosAndColors.js --commit   # actually upload + write
 *
 * Reads FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) and
 * NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET from the project .env file.
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const Jimp = require("jimp");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const COMMIT = process.argv.includes("--commit");
const LOGO_DIR = path.join(__dirname, "..", "TeamLogos");

// ---------------------------------------------------------------------------
// School (team.school) -> logo file base name (without extension)
// ---------------------------------------------------------------------------
const SCHOOL_TO_LOGO = {
  "33-р сургууль": "33",
  "Эрхэт Эрдэм сургууль": "ErhetErdem",
  "16-р сургууль": "16r surguuli",
  "52-р сургууль": "52",
  "141-р сургууль": "141",
  "Шинэ Монгол сургууль": "ShineMongol",
  "84-р сургууль": "84",
  "3-р сургууль": "3r surguuli",
  "31-р сургууль": "31",
  "Үнүр сургууль": "UnurTsogtsolbor",
  "1-р сургууль": "1r surguli",
  "Амгалан сургууль": "Amgalan",
  "21-р сургууль": "21",
  "117-р сургууль": "117",
  "151-р сургууль": "151",
  "93-р сургууль": "93",
  // aliases for how the strings actually appear in Firestore
  "33": "33",
  "117": "117",
  "Шинэ Монгол": "ShineMongol",
  "Өнөр": "UnurTsogtsolbor",
  "Үнүр": "UnurTsogtsolbor",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalize(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

// Resolve the actual logo file for a base name, preferring png.
function resolveLogoFile(base) {
  for (const ext of ["png", "jpeg", "jpg"]) {
    const p = path.join(LOGO_DIR, `${base}.${ext}`);
    if (fs.existsSync(p)) return { path: p, ext };
  }
  return null;
}

function toHex(r, g, b) {
  const h = (n) => Math.round(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hueDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Extract a primary (vivid, dominant) and secondary (distinct) colour
 * from a logo image. White/transparent background pixels are ignored.
 */
async function extractColors(filePath) {
  const image = await Jimp.read(filePath);
  image.resize(120, Jimp.AUTO);
  const { data, width, height } = image.bitmap;

  const buckets = new Map(); // quantized key -> {count, r, g, b}
  const Q = 32; // quantization step

  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const a = data[o + 3];
    if (a < 128) continue; // transparent

    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    if (mn > 232 && mx - mn < 22) continue; // near-white background

    const key = `${Math.round(r / Q)}-${Math.round(g / Q)}-${Math.round(b / Q)}`;
    let bk = buckets.get(key);
    if (!bk) {
      bk = { count: 0, r: 0, g: 0, b: 0 };
      buckets.set(key, bk);
    }
    bk.count++;
    bk.r += r;
    bk.g += g;
    bk.b += b;
  }

  const list = [...buckets.values()]
    .map((bk) => {
      const r = bk.r / bk.count;
      const g = bk.g / bk.count;
      const b = bk.b / bk.count;
      const { h, s, v } = rgbToHsv(r, g, b);
      // weight vivid, mid-brightness colours over washed-out / near-black ones
      const weight = bk.count * (0.15 + s) * (0.35 + Math.min(v, 1 - v) + v * 0.4);
      return { r, g, b, h, s, v, count: bk.count, weight };
    })
    .sort((a, b) => b.weight - a.weight);

  if (list.length === 0) {
    return { primary: "#2521F2", secondary: "#1A1A2E" };
  }

  let primary = list[0];
  // If the dominant bucket is basically grey/black/white, prefer the most
  // prominent genuinely-saturated colour as the brand primary instead.
  if (primary.s < 0.25 || primary.v < 0.18) {
    const vivid = list.find((c) => c.s >= 0.3 && c.v > 0.22);
    if (vivid) primary = vivid;
  }
  // secondary: highest-weight colour that is clearly different from primary
  let secondary = list.find(
    (c) =>
      c !== primary &&
      (hueDiff(c.h, primary.h) > 35 ||
        Math.abs(c.v - primary.v) > 0.3 ||
        Math.abs(c.s - primary.s) > 0.4),
  );
  if (!secondary) {
    // fall back to a darker shade of the primary
    secondary = {
      r: primary.r * 0.35,
      g: primary.g * 0.35,
      b: primary.b * 0.4 + 25,
    };
  }

  return {
    primary: toHex(primary.r, primary.g, primary.b),
    secondary: toHex(secondary.r, secondary.g, secondary.b),
  };
}

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------
function initFirebase() {
  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`;

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY missing in .env");
  }
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
    storageBucket: bucketName,
  });
  return { db: admin.firestore(), bucket: admin.storage().bucket(bucketName) };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n=== Team logos + colours ${COMMIT ? "(COMMIT)" : "(DRY RUN)"} ===\n`);
  const { db, bucket } = initFirebase();

  const snap = await db.collection("teams").get();
  console.log(`Found ${snap.size} team documents in Firestore.\n`);

  const contentTypes = { png: "image/png", jpeg: "image/jpeg", jpg: "image/jpeg" };
  let matched = 0;
  const unmatched = [];

  for (const doc of snap.docs) {
    const team = doc.data();
    const school = normalize(team.school);
    const base = SCHOOL_TO_LOGO[school];

    if (!base) {
      unmatched.push(`${doc.id}  school="${team.school}"  (no mapping)`);
      continue;
    }
    const file = resolveLogoFile(base);
    if (!file) {
      unmatched.push(`${doc.id}  school="${school}"  (file "${base}" not found)`);
      continue;
    }

    const colors = await extractColors(file.path);
    const destName = `team-logos/${base.replace(/\s+/g, "-")}.${file.ext}`;
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destName}`;

    console.log(`• ${doc.id}  ${school}  (${team.name || ""})`);
    console.log(`    logo file : ${path.basename(file.path)}`);
    console.log(`    -> storage: ${destName}`);
    console.log(`    old logo  : ${team.logo}`);
    console.log(`    new logo  : ${publicUrl}`);
    console.log(
      `    old colors: ${team.colors?.primary} / ${team.colors?.secondary}`,
    );
    console.log(`    new colors: ${colors.primary} / ${colors.secondary}`);

    if (COMMIT) {
      await bucket.upload(file.path, {
        destination: destName,
        metadata: { contentType: contentTypes[file.ext], cacheControl: "public, max-age=31536000" },
      });
      await bucket.file(destName).makePublic();
      await doc.ref.update({
        logo: publicUrl,
        "colors.primary": colors.primary,
        "colors.secondary": colors.secondary,
      });
      console.log("    ✓ uploaded + updated");
    }
    console.log("");
    matched++;
  }

  console.log(`\nMatched & ${COMMIT ? "updated" : "previewed"}: ${matched}/${snap.size}`);
  if (unmatched.length) {
    console.log("\nUNMATCHED (left untouched):");
    unmatched.forEach((u) => console.log("  - " + u));
  }
  if (!COMMIT) {
    console.log("\nDry run only. Re-run with --commit to apply.\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nERROR:", e);
    process.exit(1);
  });
