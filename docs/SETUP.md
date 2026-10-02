# Setup & development commands

The repo currently holds the **folder structure and placeholder config only**. Nothing is
installed. Follow these steps in order to generate the real projects.

## Prerequisites
- **Node.js 22 LTS** (`node -v`)
- **Git**
- Expo account (free) — needed only for EAS cloud builds
- Android: **Android Studio** (emulator) for local builds — optional if you use EAS cloud
- iOS: a **Mac + Xcode** OR **EAS cloud build** (Windows cannot compile iOS locally)

---

## 1. Shared package (`shared/`) — DONE
`@app/shared` is implemented: `money.ts`, `dates.ts`, `schedule.ts`, `types/schedule.ts`.
Uses Vitest. The golden test (PRD 12.4) plus money/date/schedule tests all pass.

```bash
# From repo root (installs vitest/typescript for the workspace)
npm install

# Run the shared tests and typecheck
npm run test --workspace @app/shared
npm run typecheck --workspace @app/shared
# or from the root: npm test   /   npm run typecheck
```

## 2. Mobile app (`apps/mobile/`) — Expo SDK 57

> **Pin the SDK explicitly.** During the SDK 57 transition, `create-expo-app@latest`
> *without* a version creates an **SDK 54** project. Use `default@sdk-57` to get SDK 57.

```bash
# Generate the Expo app (default template = TypeScript + Expo Router + src/ dir, SDK 57)
npx create-expo-app@latest apps/mobile --template default@sdk-57
```

### If it says "the directory mobile has files that might be overwritten"
`create-expo-app` refuses to run into a non-empty folder. Our placeholder `.env.example`
and `src/` cause this. Move them aside, generate, then merge back:

```bash
# From repo root — back up placeholders
New-Item -ItemType Directory -Force -Path .mobile-placeholder-backup | Out-Null
Move-Item -Force apps/mobile/.env.example .mobile-placeholder-backup
Move-Item -Force apps/mobile/src          .mobile-placeholder-backup

# apps/mobile is now empty — generate
npx create-expo-app@latest apps/mobile --template default@sdk-57

# Restore our .env.example and the extra src/ subfolders the template doesn't create
# (components, features, services/api, theme, i18n, utils), then delete the backup.
```

### Run it (Phase 0 — mock data)
```bash
cd apps/mobile
npx expo start      # press a = Android, i = iOS (Mac), w = web, or scan QR in Expo Go
```

### Wire the generated app into the monorepo (after generation)
1. Set the app's `package.json` name (e.g. `@app/mobile`) so it joins the npm workspace.
2. Point its `tsconfig.json` at the root `tsconfig.base.json` (`"extends": "../../tsconfig.base.json"`).
3. Add a `metro.config.js` that watches the repo root so Metro resolves `@app/shared`.

### Switch to a development build (Phase 1 — when adding biometrics / secure-store)
```bash
npx expo install expo-dev-client

# Option A — EAS cloud build (recommended on Windows; no local Android/Xcode needed)
npm install -g eas-cli
eas login
eas build --platform android --profile development
eas build --platform ios --profile development

# Option B — local build (needs Android Studio / Xcode installed)
npx expo run:android        # add --device for a physical phone
npx expo run:ios            # Mac only

# After the dev build is installed, run the JS server:
npx expo start              # (targets the dev build automatically once expo-dev-client is present)
```
Rebuild the native app only after adding a native library, changing `app.config.ts`,
or upgrading the SDK: `npx expo prebuild --clean` then rebuild.

## 3. API (`apps/api/`) — Fastify
```bash
npm init -w apps/api -y
cd apps/api
# add: fastify, zod, mssql, knex, pino, @fastify/rate-limit, @fastify/helmet, jsonwebtoken
```

> **Database = Microsoft SQL Server (not MySQL).** The client runs SQL Server, so the
> client-DB driver is `mssql` (Tedious), not `mysql2`. Do **not** develop/test against
> PostgreSQL or MySQL — the SQL dialect, driver, and paging differ and queries written
> here would not run against the client's real DB. Test against SQL Server itself.
> See `docs/DECISIONS.md` for the app-owned-schema engine decision (SQL Server vs Postgres).

## 4. Local DB stack
```bash
docker compose up        # starts SQL Server (fake seed only) — see docker-compose.yml
```

## 5. Root tooling
```bash
npm install              # installs all workspace deps once package.jsons exist
npm run lint
npm run typecheck
npm test
```

---

## Which Expo workflow for this app?

| Stage | Mode | Why |
|---|---|---|
| Phase 0 (foundation, mock data) | **Expo Go** (`npx expo start`) | Fastest loop; no native modules yet. |
| Phase 1+ (biometrics, secure-store, push) | **Development build** | Expo Go can't run these native features reliably. |
| iOS from Windows | **EAS cloud build** | Windows can't compile iOS; EAS builds in the cloud. |
| Store submission | **EAS Build + EAS Submit** | Produces signed store binaries. |

> **SDK 57 vs Expo Go on a physical phone:** Expo Go on the app stores tracks SDK 54.
> To run SDK 57 on a device you use a **development build** (which you need anyway for
> biometrics / secure-store / push), or test on an emulator/simulator.
