# Loan App (NBFC Customer Tracker)

A **read-only** customer-facing loan tracker for an Indian NBFC. No money moves through the app, in any phase. See [`PRD.md`](./PRD.md) for the authoritative spec.

## Monorepo layout (npm workspaces)

```
loan-app/
├── shared/        # @app/shared — pure domain logic (money, dates, schedule) + generated types
├── apps/
│   ├── mobile/    # Expo (SDK 57) React Native app, Expo Router, TypeScript strict
│   └── api/       # Fastify API (Node 22 LTS), read-only SQL Server access, OTP/JWT auth
├── contracts/     # openapi.yaml — single source of truth for the API
└── docs/          # DECISIONS.md, DB_MAPPING.md, DB_ACCESS.md
```

## Tech stack (verified latest, Oct 2026)

- **Node.js 22 LTS**
- **Expo SDK 57** (React Native 0.86, React 19.2) — use `expo@57.0.17+`
- **Expo Router** (file-based routing, routes live in `apps/mobile/src/app`)
- **TypeScript strict**, TanStack Query, react-hook-form + zod
- **Fastify** API, `mssql` (read-only pool — client runs **SQL Server**, not MySQL), Knex migrations (app-owned schema)

## Setup commands (nothing is installed yet)

> This repo currently contains the **folder structure only**. Run the commands below to generate the real projects. See [`docs/SETUP.md`](./docs/SETUP.md) for the full, ordered walkthrough.

```bash
# 1. From the repo root — install workspace tooling once package.jsons exist
npm install

# 2. Generate the Expo app into apps/mobile (SDK 57 pinned — plain --template gives SDK 54)
#    If it says the directory isn't empty, see docs/SETUP.md for the placeholder-backup steps.
npx create-expo-app@latest apps/mobile --template default@sdk-57

# 3. Start Phase 0 in Expo Go (fast loop, mock data)
cd apps/mobile && npx expo start

# 4. When you add native modules (biometrics, secure-store) — switch to a dev build
npx expo install expo-dev-client
eas build --platform android --profile development   # cloud build (works on Windows)
```

## Phases

- **Phase 0** — Foundation: monorepo, shared schedule calculator (golden tests), mock-data mobile app.
- **Phase 1** — MVP: real API + OTP auth, all screens, store submission assets.
- **Phase 2** — Push notifications, Hindi, encrypted offline cache.
- **Phase 3** — Optional document downloads. **Payments are never in scope.**

See `PRD.md` Section 20 for the full task breakdown with acceptance criteria.
