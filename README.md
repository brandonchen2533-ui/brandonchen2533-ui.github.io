# LOUIS 🌿

A health app that fuses **Yuka**, **Oasis**, and **Cal AI**: every food you log gets
**two numbers** — how much it *costs* you (calories + macros) and how *good* it is
for you (a 0–100 health score). Log by **barcode** or by **photo**.

## What it does

- **Scan a barcode** → real product lookup (Open Food Facts), a Yuka-style 0–100
  health score, Nutri-Score, additive risk breakdown, processing level, and
  highlights. Low-scoring products surface **healthier alternatives** in the same
  category (tap to drill into one). Cosmetics fall back to ingredient-risk scoring.
- **Snap a meal photo** → Claude vision (Opus 4.8) estimates calories + macros and
  a diet-quality score (Cal AI style). Works with a built-in stub when no API key
  is set.
- **Daily diary** → calorie ring, macro bars, diet-quality average, logging streak,
  history, and editable goals (Settings).
- **Installable PWA** → add to your phone home screen; the app shell and previously
  scanned products work **offline**. Product lookups are cached (7-day TTL) so repeat
  scans are instant.

## Architecture

```
core/        Framework-free TypeScript — ports straight to React Native later
  types.ts            domain model
  scoring/            Nutri-Score, additive DB, food/cosmetic scoring
  openFoodFacts.ts    barcode → normalized Product
  nutrition.ts        portion → macros
  photoEstimate.ts    photo → estimate (calls /api, falls back to stub)
  diary.ts            aggregation, streaks, ids
src/         React (Vite) UI — screens, components, store (localStorage)
server/      Node API: POST /api/estimate (Claude vision), graceful no-key fallback
```

## Run it

```bash
npm install
npm start          # web (5173) + API (8787) together
```

Open http://localhost:5173.

### Enable real AI photo estimates (optional)

```bash
cp .env.example .env
# set ANTHROPIC_API_KEY=...
npm start
```

Without a key, the photo flow uses a local stub estimator so everything still works.

## Scripts

- `npm run dev` — web only
- `npm run server` — API only
- `npm start` — both
- `npm run build` — production build

## Notes

- Health scoring is Yuka-inspired (60% nutrition / 30% additives / 10% organic) with
  a beverage-specific Nutri-Score table so sugary drinks rate correctly.
- No accounts; data is stored in the browser (localStorage).
- Next step: a React Native shell reusing `core/` verbatim.
