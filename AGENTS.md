# AGENTS.md — Loan App (NBFC Customer Tracker)

Quick orientation + working rules. Authoritative spec: [`PRD.md`](./PRD.md).

## What we're building

A **read-only** customer loan tracker for an Indian NBFC. Customer logs in with mobile OTP,
views their loans: outstanding balance, EMI schedule, charges, payment history.

- **Tracker only, every phase — NEVER moves money.** No payment button/link/gateway/UPI/QR/
  bank details, no loan application, no offers/ads, no collection actions. If a task seems to
  need one, stop and flag it in `docs/DECISIONS.md`. (PRD Section 0, rule 11.)
- Mobile talks **only** to our API (HTTPS + JWT), never the DB. API reads the client DB
  read-only via repositories, scoped by `customerId` on every query, whitelisted fields only.

## Structure (npm workspaces)

```
shared/        @app/shared — pure domain logic: money (paise), dates (IST), schedule calc + types
apps/mobile/   @app/mobile — Expo SDK 57 app; routes in src/app (see apps/mobile/AGENTS.md)
apps/api/      Fastify API — src/{modules,repositories,schedule,adapters/sms,db,config,lib}
contracts/     openapi.yaml — API source of truth
docs/          SETUP.md · DECISIONS.md · DB_MAPPING.md · DB_ACCESS.md
```

## Stack

- **Node 22 LTS**, **TypeScript strict** everywhere.
- **Mobile:** Expo **SDK 57** (RN 0.86, React 19.2), Expo Router, TanStack Query,
  react-hook-form + zod, expo-secure-store, expo-local-authentication.
- **API:** Fastify, zod, Knex (app-owned schema), JWT + OTP auth.

## Expo APIs — read the docs, don't trust training data

Expo changes every SDK release; remembered APIs are often wrong. Before touching any Expo /
EAS / React Native API: check the `expo` major version in `package.json`, read the versioned
docs `https://docs.expo.dev/versions/v<major>.0.0/`, and use `https://docs.expo.dev/llms.txt`
(index of all docs + LLM-misconception corrections) to find the exact page. See
[`apps/mobile/AGENTS.md`](./apps/mobile/AGENTS.md) for the full mobile rules and commands.

## Styling — design tokens, NOT Tailwind

**Do NOT use Tailwind/NativeWind** (or Tamagui, unistyles, styled-components). Use **design
tokens + RN `StyleSheet`** (PRD 6.4):

- Single source of truth: `apps/mobile/src/constants/theme.ts` (the token exports are the
  `App*` ones: `AppColors`, `AppSpacing`, `AppRadius`, `AppTypography`, `StatusColorRole`).
  Read them via `useAppTheme()` from `@/hooks/use-theme`, then `StyleSheet.create` using
  `theme.colors.*`, `theme.spacing.*`, etc.
- Never hardcode a colour or size in a component. Pair every status colour with a label + icon.
- `src/global.css` is template font-vars (web only), not Tailwind. The template's own
  `Colors`/`Spacing`/`Fonts` exports in the same file belong to the generated starter screens —
  for loan-app UI use the `App*` tokens via `useAppTheme()`.

Switching styling libraries requires a `docs/DECISIONS.md` entry first.

## Shared code — use `@app/shared`, don't duplicate

Domain logic lives **once** in `@app/shared` and is consumed by both the mobile app and the
API. Before writing a helper for money, dates, or the repayment schedule, check `shared/src`
and reuse it. Do **not** re-implement or copy this logic into `apps/mobile` or `apps/api`.

- **Money:** always **integer paise**, no floats (PRD 10.1). Use `formatINR`, `rupeesToPaise`,
  `assertPaise` from `@app/shared`. Never `parseFloat`/`toFixed` on money.
- **Dates:** IST calendar dates via `@app/shared` (`addDays`, `addMonths`, `compareIsoDate`,
  `todayIST`, `formatDate`, …). Never `new Date()` for IST "today" logic outside `shared/dates.ts`.
- **Schedule:** installment schedule, status, overdue counts, and next-due come from
  `computeSchedule` in `@app/shared`. The API's `ScheduleProvider` and every mobile screen
  derive from it — do not hand-roll schedule math anywhere else.
- **Types:** shared domain types live in `shared/src/types`. Import them; don't redeclare.

If something is needed in more than one app, it belongs in `@app/shared`. Add it there (with a
test), then import it. New shared behaviour must ship with a Vitest test (`npm test` in `shared`).

## Phases

0 Foundation (monorepo, schedule calc + golden tests, mobile on mock data) · 1 MVP (API +
OTP, all screens, store assets) · 2 Push, Hindi, offline cache · 3 Optional docs. Payments
never in scope.

## Working rules

1. **Update docs with the change** (part of done): commands → `SETUP.md` + `README.md`;
   assumptions/decisions → `DECISIONS.md`; new env var → the relevant `.env.example`;
   endpoint change → `openapi.yaml` first; DB mapping → `DB_MAPPING.md`.
2. **Contract first:** change `openapi.yaml` before endpoints/client code, then regen types.
3. **Never commit** secrets, `.env`, real customer data, or client web-app screenshots.
   Fixtures use fake data only.
4. **Ambiguous & uncovered?** Pick the safest option (more private/secure/simpler), log it in
   `DECISIONS.md`, continue.
5. **Verify before done:** lint + `npx tsc --noEmit` + tests where they exist. Exit 0 ≠ done —
   check against PRD Section 20 acceptance criteria.

## ⚠️ Pending conflict — DB engine (API work ONLY)

> Applies when touching `apps/api/`, `docker-compose.yml`, `apps/api/.env.example`,
> `docs/DB_ACCESS.md`, `docs/DB_MAPPING.md`, or DB/repository code. **Ignore for
> mobile/`shared`/docs-only work** — unaffected by the DB engine.

PRD assumes **MySQL**; client's real DB is **Microsoft SQL Server**. Not yet reconciled.
Before reading the client DB: use the **`mssql`** driver (not `mysql2`) and **SQL Server in
Docker** for local tests (never Postgres/MySQL — dialect/driver/paging differ).
Undecided (confirm, then log in `DECISIONS.md`): (1) on-prem SQL Server vs Azure SQL;
(2) app-owned schema on SQL Server (same server) vs a separate hosted PostgreSQL.
Still-MySQL files to fix once confirmed: `docker-compose.yml`, `apps/api/.env.example`,
`docs/DB_ACCESS.md`, PRD §6.2/14/19. Flag this in any API change until resolved.
