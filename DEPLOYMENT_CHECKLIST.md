# Deployment & Testing Checklist

## 0. Prerequisites

- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in: `firebase login`
- Project selected: `firebase use YOUR_PROJECT_ID`
- Service account key downloaded and set:
  ```powershell
  $env:GOOGLE_APPLICATION_CREDENTIALS = "path\to\serviceAccountKey.json"
  ```

---

## 1. Install dependencies

```powershell
# Root project (Next.js)
cd D:\Tselmeg\WEB\sain-league
npm install

# Cloud Functions
cd functions
npm install
```

---

## 2. Build Cloud Functions

```powershell
cd D:\Tselmeg\WEB\sain-league\functions
npx tsc
```

Verify zero errors. Output goes to `functions/lib/`.

---

## 3. Local testing with emulators

```powershell
cd D:\Tselmeg\WEB\sain-league

# Start Firestore + Functions + Auth emulators
firebase emulators:start --only firestore,functions,auth
```

In a second terminal, start Next.js:

```powershell
cd D:\Tselmeg\WEB\sain-league
npm run dev
```

Set your `.env.local`:

```
NEXT_PUBLIC_FUNCTIONS_URL=http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

### Test CSV upload with curl

```powershell
# 1. Get an ID token (emulator shortcut — create a test user first)
#    Or use the admin UI login and copy the token from browser devtools.

# 2. Upload a CSV
curl -X POST `
  "http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1/uploadGameCsv" `
  -H "Authorization: Bearer YOUR_ID_TOKEN" `
  -F "seasonId=2026" `
  -F "gameId=game-008" `
  -F "teamId=team-005" `
  -F "file=@path\to\boxscore.csv"
```

Expected response:

```json
{
  "ok": true,
  "gameId": "game-008",
  "homeScore": 72,
  "awayScore": 65,
  "playersWritten": 5,
  "message": "Boxscores written, aggregates updated."
}
```

### Test via the admin UI

1. Open http://localhost:3000/admin
2. Log in with an admin account
3. In the "CSV Статистик оруулах" section:
   - Pick a game from the dropdown
   - Pick home or away team
   - Attach a `.csv` file
   - Click "Upload хийх"
4. Verify the result card shows scores + player count

---

## 4. Run migration (one-time)

For **emulator** testing:

```powershell
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
node tools/migrateDatabaseJsonToFirestore.js
```

For **production**:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "path\to\serviceAccountKey.json"
node tools/migrateDatabaseJsonToFirestore.js
```

---

## 5. Set admin custom claims

To grant a user the `admin:true` custom claim (required by Cloud Functions auth guard):

```js
// Run this once via Node.js or Firebase Admin SDK console:
const admin = require("firebase-admin");
admin.initializeApp();

admin
  .auth()
  .getUserByEmail("admin@sainleague.mn")
  .then((user) => admin.auth().setCustomUserClaims(user.uid, { admin: true }))
  .then(() => console.log("✅ Admin claim set"))
  .catch(console.error);
```

Or create a one-liner script:

```powershell
node -e "
  const admin = require('firebase-admin');
  admin.initializeApp();
  admin.auth().getUserByEmail('admin@sainleague.mn')
    .then(u => admin.auth().setCustomUserClaims(u.uid, { admin: true }))
    .then(() => console.log('Done'))
    .catch(console.error);
"
```

> **Security note:** The `AdminGuard` component checks `userData.role === 'admin'`
> from the Firestore `users` collection. The Cloud Function `requireAdmin()` checks
> the Firebase Auth custom claim `admin: true` on the ID token. Both must be set
> for full admin access (UI + API).

---

## 6. Deploy to production

```powershell
cd D:\Tselmeg\WEB\sain-league

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Firestore rules & indexes
firebase deploy --only firestore:rules,firestore:indexes

# Deploy storage rules (if needed)
firebase deploy --only storage

# Build and deploy Next.js (your hosting method)
npm run build
# Then deploy to Vercel/Firebase Hosting/etc.
```

---

## 7. Post-deploy: run migration + recompute

```powershell
# 1. Run migration script (ONCE in production)
$env:GOOGLE_APPLICATION_CREDENTIALS = "path\to\serviceAccountKey.json"
node tools/migrateDatabaseJsonToFirestore.js

# 2. Call recompute endpoints to build full enhanced standings + leaderboards
$token = "YOUR_ADMIN_ID_TOKEN"

curl -X POST `
  "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/recomputeStandings" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"seasonId":"2026"}'

curl -X POST `
  "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/recomputeLeaderboards" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"seasonId":"2026"}'

# 3. Or run full integrity recompute (rebuilds everything from boxscores)
curl -X POST `
  "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/integrityRecomputeHttp" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"seasonId":"2026"}'
```

---

## 8. Smoke tests (what to verify)

- [ ] `/standings` page loads from `seasons/2026/cached/standings` — shows TEAM, W, L, PCT, GB, HOME, ROAD, STREAK, L-10
- [ ] `/stats` page loads leaderboards from `seasons/2026/cached/playerLeaders`
- [ ] `/admin` page shows the CSV upload component with game picker
- [ ] Upload a CSV → response shows `homeScore`, `awayScore`, `playersWritten`
- [ ] Check Firestore: `seasons/2026/games/{gameId}/boxscores/*` subcollection has docs
- [ ] Check Firestore: `seasons/2026/playerAggregates/{playerId}` updated with increments
- [ ] Check Firestore: `seasons/2026/teamAggregates/{teamId}` updated with increments
- [ ] Check Firestore: `seasons/2026/cached/standings` re-generated after upload
- [ ] Re-upload same CSV → deltas applied (no duplicate increments)
- [ ] Nightly `integrityRecompute` scheduled function visible in Firebase Console > Functions
- [ ] `functions/lib/` contains: `adminSetup.js`, `csvHelpers.js`, `firestoreHelpers.js`, `constants.js`, `uploadGameCsv.js`, `recomputeCache.js`, `integrityRecompute.js`, `index.js`

---

## 9. Environment variable summary

| Variable                          | Where                 | Purpose                                   |
| --------------------------------- | --------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`    | `.env.local`          | Client-side Firebase config               |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `.env.local`          | Client-side Firebase config               |
| `NEXT_PUBLIC_FUNCTIONS_URL`       | `.env.local`          | Cloud Functions base URL for admin upload |
| `FIREBASE_SERVICE_ACCOUNT_KEY`    | `.env.local` (server) | Admin SDK auth (Next.js API routes)       |
| `GOOGLE_APPLICATION_CREDENTIALS`  | Shell env             | Service account for migration script      |
| `FIRESTORE_EMULATOR_HOST`         | Shell env (dev only)  | Point to local emulator                   |
| `FIREBASE_AUTH_EMULATOR_HOST`     | Shell env (dev only)  | Point to local auth emulator              |
