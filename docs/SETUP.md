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

## 3. API (`apps/api/`) — Express 5 + TypeScript — SCAFFOLDED

The API skeleton is in place (task A-01). Stack: **Express 5**, `zod` (env + request
validation), `mysql2` (read-only client-DB pool), `knex` (app-owned schema migrations),
`pino`/`pino-http` (structured logs, PII-redacted), `helmet` + `express-rate-limit` (security),
`jsonwebtoken` (auth, A-04). Runs on **Node.js 22 LTS** via `tsx` (no separate build step; the
`@app/shared` workspace ships raw TS). See `docs/DECISIONS.md` for the Express-vs-Fastify note.

```bash
# From repo root — installs all workspace deps (shared + mobile + api)
npm install

# API dev loop (watches + restarts). Needs a MySQL to be reachable (see step 4) OR it will
# log a fatal read-only-guard error and exit — expected without a DB.
npm run dev --workspace @app/api

# Typecheck + tests (skeleton smoke tests need no DB)
npm run typecheck --workspace @app/api
npm run test --workspace @app/api

# App-owned schema migrations (once MySQL is up)
npm run migrate:latest --workspace @app/api

# Copy env and fill in secrets (JWT/OTP secrets must be >= 32 chars)
# apps/api/.env.example -> apps/api/.env
```

Running skeleton today: `GET /v1/health`, `GET /v1/health/ready` (DB connectivity),
`GET /v1/config`. Auth, `/me`, and loan endpoints are the next tasks (A-04, A-08, A-09).

> **Database = MySQL.** Confirmed with the client (2026-10-07): the client runs **MySQL**,
> so the client-DB driver is `mysql2` with a pooled, read-only connection and parameterised
> queries only (PRD §6.2, §14.1). The app-owned `mobile_app` schema lives on the same MySQL
> server with its own read/write user. Run `docker compose up` for a local MySQL 8.4 stack
> with fake seed data. See `docs/DECISIONS.md` for the engine decision record.

## 4. Local DB stack (MySQL 8.4 via Docker in WSL)

Docker runs **inside WSL 2** here (not Docker Desktop), so run compose from a WSL shell. On
first start the container runs `apps/api/src/db/seed/*.sql`, creating both schemas and both
least-privilege users (`client_db`+`app_ro` SELECT-only, `mobile_app`+`app_rw` full DML).

```bash
# In a WSL terminal (Ubuntu). cd to the repo via the Windows mount:
cd /mnt/s/1-Project/zemon/laxmi-finanace

docker compose up -d                 # start MySQL in the background
docker compose ps                    # STATUS should become "healthy"
docker compose logs -f mysql         # watch init (Ctrl-C to stop watching)

docker compose down                  # stop (data persists in ./docker-data)
docker compose down -v; rm -rf docker-data   # FULL reset (re-runs the seed)
```

**Networking:** on WSL 2, Windows reaches the container at `localhost:3306`, so the API
(running on Windows via `npm run dev`) connects with `CLIENT_DB_HOST=127.0.0.1` out of the box
(`apps/api/.env`). If `localhost` ever fails, get the distro IP with `wsl hostname -I` and use
that instead.

**Local-dev credentials** (fake data only — never production): root `devroot`;
`app_ro`/`ro_pass` (read-only `client_db`); `app_rw`/`rw_pass` (read/write `mobile_app`).
These are already set in `apps/api/.env`.

Once MySQL is `healthy`, from Windows:
```powershell
npm run migrate:latest --workspace @app/api   # create app-owned tables (after A-02 adds them)
npm run dev --workspace @app/api              # boots; /v1/health/ready should return "ready"
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
