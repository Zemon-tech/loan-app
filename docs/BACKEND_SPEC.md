# Backend Spec — NBFC Customer Loan Tracker API

| | |
|---|---|
| **Status** | Living document — the build reference for `apps/api` |
| **Date** | 2026-10-10 |
| **Authority** | Subordinate to [`PRD.md`](../PRD.md) and [`contracts/openapi.yaml`](../contracts/openapi.yaml). Where this doc and the PRD disagree, the PRD wins unless a row in [`DECISIONS.md`](./DECISIONS.md) overrides it. |
| **Scope** | The backend only (`apps/api` + its use of `@app/shared`). Mobile is covered by [`MOBILE_UI_UX.md`](./MOBILE_UI_UX.md). |

> **Read this first.** This spec exists because the delivery model differs from a naive reading
> of the PRD. We are building a **demo-first backend** now, and the client will **later give us
> their own APIs** (not raw database access) to connect to their system. The whole backend is
> therefore designed around a **swappable data layer**: everything runs on mock/fixture data
> today, and switching to the client later is a configuration change, not a rewrite.

---

## 1. The delivery model (why this backend is shaped the way it is)

### 1.1 What the client actually gives us, and when

The PRD's default assumption (Q1) was: *"client gives us read-only MySQL; we write SQL."* The
real plan, confirmed with the product owner (2026-10-10), is different and simpler for us:

```
PHASE A — NOW (demo):   our API  ──▶  MockLoanRepository (fixtures in @app/shared / local)
PHASE B — LATER (live): our API  ──▶  Client's API (HTTPS) ── anti-corruption layer ──▶ client system
```

- The client **already has** their database and staff software. We do **not** build or own
  their data. We never get their DB schema up front and must never invent it (PRD rule 5).
- For the **demo**, our backend serves **100% fake data** so the mobile app is fully functional
  end-to-end with no dependency on the client.
- **Later**, the client exposes **their own API** to us. Our backend becomes a **thin, secure
  adapter** in front of it: it authenticates the customer (OTP/JWT — our responsibility),
  then fetches that customer's loan data from the client's API, strips it to the customer-safe
  whitelist, and returns our stable contract to the mobile app.

### 1.2 Consequence: our API contract never changes when the backend flips to live

The mobile app only ever talks to **our** API (`/v1/...`, PRD §10). Whether the data behind it
comes from fixtures or the client's live API is invisible to the app. This is the single most
important property of the design and everything below protects it.

### 1.3 Anti-corruption layer (ACL)

Our backend is the **downstream** system with its own clean domain model (defined in
`@app/shared` + the DTOs in PRD §10.3). The client's system is the **upstream** — we do not
control its shape, naming, or quirks, and it may be legacy. We place an **anti-corruption
layer** at the boundary so the upstream model never leaks into ours. Industry pattern,
confirmed against current (2026) DDD / cloud-architecture guidance:

- **Facade** — one narrow module that knows how to *call* the client (HTTP client, auth to the
  client, their endpoints/field names). The only place that imports the client's SDK/shape.
- **Translator** — the single place that maps client responses → our internal `*Record` types
  (field renaming, unit conversion to **integer paise**, status-code mapping). One translation
  point, so when the client changes something we fix it in exactly one file.
- **Adapter** — implements our `LoanRepository` interface by orchestrating Facade + Translator.
  The rest of the backend depends only on the interface and never knows the client exists.

> **The rule:** no file outside `repositories/client/` (the ACL) may import or reference the
> client's API shape, URLs, field names, or SDK. If you see a client field name in a service or
> route, the ACL has been bypassed — that is a bug.

---

## 2. What we are building (backend deliverables)

A stateless Node.js/TypeScript HTTP API that:

1. **Authenticates customers** by mobile-number OTP, then issues JWT access + rotating refresh
   tokens. This is **our** responsibility in both demo and live phases — the client only
   provides loan *data*, not customer auth.
2. **Serves customer-safe loan data** (list, detail, repayment schedule, transactions) scoped
   strictly to the authenticated customer, through a whitelist of fields (PRD §10, Appendix B).
3. **Owns a small database** (`mobile_app` schema) for OTP records, sessions, devices, deletion
   requests, and an audit log. This is the only data we persist.
4. **Computes the repayment schedule** from loan terms using the shared pure calculator
   (`@app/shared`), unless the client supplies a schedule table/endpoint.
5. **Exposes app config** (`/v1/config`) for force-update, maintenance, lender/support details.
6. **Reads loan data through a swappable `LoanRepository`** — `MockLoanRepository` now,
   `ClientApiLoanRepository` (the ACL) later. (A `MysqlLoanRepository` remains possible if the
   client ever gives direct DB access instead of an API — same interface.)

**We are NOT building:** anything that moves money, loan applications/offers, marketing, the
client's database or staff tooling, or any write path into the client's system (PRD §0 rule 11,
§7.1 A5/A7). Read-only, tracker-only, every phase.

---

## 3. Current state (as of 2026-10-10)

Implemented and verified (`tsc --noEmit` clean, smoke tests pass, boots against MySQL):

| Area | State |
|---|---|
| App skeleton (A-01) | ✅ Express 5 + TS, zod env with boot guards, pino logger (PII-redacted), request-id, typed `AppError` + error handler, helmet, rate limiters |
| Health + config | ✅ `GET /v1/health`, `/v1/health/ready` (DB ping), `/v1/config` |
| DB connections | ✅ read-only `mysql2` client pool + `SHOW GRANTS` guard; `mobile_app` Knex connection + knexfile |
| Local DB | ✅ MySQL 8.4 in Docker (WSL), `client_db` + `mobile_app` schemas, `app_ro`/`app_rw` users seeded |
| SMS adapter | ✅ `SmsProvider` interface + Console (dev) / Msg91 (stub) |
| Schedule provider | ✅ `ComputedScheduleProvider` wired to `@app/shared` |
| Repository | ⚠️ `LoanRepository` **interface + record types only** — no implementation yet |

Not yet built: `mobile_app` migrations (A-02), auth (A-04), Mock repository + fixtures (A-05/06),
DTO mappers + blacklist test (A-06), loan endpoints (A-08), `/me` + `DELETE /me` (A-09),
`openapi.yaml` fill-out (F-03), the client-API ACL (new; live phase).

---

## 4. Technology (as built)

| Concern | Choice | Note vs PRD |
|---|---|---|
| Runtime | **Node.js 22 LTS**, TypeScript strict | PRD §6.2 |
| Framework | **Express 5** (`express@5.2.1`) | Deviation from Fastify — see DECISIONS 2026-10-07. Express 5 forwards async errors to the error handler automatically. |
| Validation | **zod v4** (request + env; response-shape in tests) | PRD §6.2 |
| App DB | **MySQL 8.4**, `mobile_app` schema, **Knex** migrations | PRD §6.2/§14.4 |
| Client data (demo) | **Mock repository** (fixtures) | PRD §14.2 |
| Client data (live) | **Client API adapter (ACL)** over `fetch`/`undici` | New — replaces the PRD's direct-MySQL default per the delivery model (§1) |
| Auth | OTP → JWT access (15 min) + rotating refresh (30 d) | PRD §11 |
| Logging | **pino** / `pino-http`, no PII, request ids | PRD §6.2 |
| Security | **helmet**, **express-rate-limit** v8 | PRD §15.1 |
| Tests | **Vitest** + **supertest**; MySQL via docker-compose for integration | PRD §6.2/§18 |
| Run model | **tsx** in dev and prod (no compiled `dist`); `@app/shared` is raw TS | DECISIONS 2026-10-07 |
| Container | **Docker** | PRD §6.2 |

Dependencies to add as the build proceeds (not yet installed): `undici` or native `fetch` for
the client ACL, `@asteasolutions/zod-to-openapi` **or** `express-openapi-validator` for the
contract (decision in §9.1), a UUID source (Node `crypto.randomUUID`, already used).

---

## 5. Architecture & layering

```
            ┌──────────────────────────────────────────────────────────────┐
            │                      apps/api (our backend)                    │
            │                                                                │
 mobile ───▶│  routes (modules/*)  ─ zod-validate ─▶  services  ─▶  DTO      │───▶ mobile
  (HTTPS,   │     health, config, auth, me, loans, devices                   │   (customer-safe
   JWT)     │                                   │                            │    JSON, PRD §10)
            │                                   ▼                            │
            │                        LoanRepository (interface)              │
            │                        ┌──────────┴───────────┐                │
            │              MockLoanRepository      ClientApiLoanRepository    │
            │               (fixtures, demo)        (ACL: facade+translator)  │
            │                                              │                  │
            │  appDb (Knex, mobile_app):                   │ HTTPS            │
            │  otp, sessions, devices, deletion, audit     ▼                  │
            └──────────────────────────────────────┬──────────────────┬──────┘
                                                    ▼                  ▼
                                        ┌────────────────┐   ┌───────────────────┐
                                        │ MySQL          │   │ Client's API       │
                                        │ mobile_app     │   │ (LIVE phase only;  │
                                        │ (we own this)  │   │  the client owns)  │
                                        └────────────────┘   └───────────────────┘
                              SMS provider ◀── auth (OTP delivery)
```

### 5.1 Layer responsibilities (dependency direction points inward)

| Layer | Folder | May depend on | MUST NOT |
|---|---|---|---|
| **Routes/controllers** | `src/modules/<name>/*.routes.ts` | services, zod schemas, `AppError` | contain business logic or SQL/HTTP-to-client calls |
| **Services** | `src/modules/<name>/*.service.ts` | repositories (interface), `@app/shared`, appDb repos, lib | import a concrete repository or the client's shape |
| **DTO mappers** | `src/modules/<name>/*.mapper.ts` | internal `*Record` types, `@app/shared` | spread raw records; emit a blacklisted field (Appendix B) |
| **Repository (interface)** | `src/repositories/LoanRepository.ts` | `@app/shared` types | — |
| **Mock repo** | `src/repositories/mock/` | fixtures, `@app/shared` | reach the network |
| **Client ACL** | `src/repositories/client/` | the client's API (facade), http client | leak client types outward (only `*Record` leaves) |
| **App DB repos** | `src/db/repos/` | Knex (`appDb`) | touch the client DB/API |
| **lib / config** | `src/lib`, `src/config` | — | import domain or routes |

### 5.2 Provider selection (one wiring point)

A single factory decides which `LoanRepository` is live, driven by env — the only place the
choice is made (mirrors the ACL "swap in one line" principle):

```ts
// src/repositories/index.ts
export function createLoanRepository(env: Env, deps): LoanRepository {
  switch (env.DATA_SOURCE) {         // 'mock' | 'client_api' | 'mysql'
    case 'client_api': return new ClientApiLoanRepository(env, deps);
    case 'mysql':      return new MysqlLoanRepository(env, deps); // only if client gives direct DB
    case 'mock':
    default:           return new MockLoanRepository();
  }
}
```

Nothing above this line knows which source is active.

---

## 6. Database structure

There are **two** databases. We **own only one**.

### 6.1 App-owned schema `mobile_app` (we own, read/write) — PRD §14.4

This is the only data we persist. MySQL, migrated via Knex (`app_rw` user). Money columns use
`BIGINT` (integer paise) — never floats. All timestamps stored UTC; "today"/IST logic lives in
`@app/shared`.

**`otp_requests`** — one row per OTP challenge.

| column | type | notes |
|---|---|---|
| `id` | CHAR(36) PK | `otp_<uuid>`-style opaque id returned to client as `otpRequestId` |
| `mobile_hash` | CHAR(64) | HMAC-SHA256 of normalised mobile — **never** plaintext (PRD §11.4) |
| `customer_id` | VARCHAR(64) NULL | set only if a customer matched; null for unknown numbers (anti-enumeration) |
| `otp_hmac` | CHAR(64) | HMAC-SHA256(otp, secret+otpRequestId) (PRD §11.1) |
| `attempts` | TINYINT default 0 | verify attempts; max 3 |
| `expires_at` | DATETIME | now + `OTP_TTL_SEC` (300s) |
| `consumed_at` | DATETIME NULL | set on success; invalidates the OTP |
| `ip` | VARCHAR(45) NULL | for rate-limit/audit (IPv4/IPv6) |
| `created_at` | DATETIME | |

Index: `(mobile_hash, created_at)`.

**`sessions`** — one row per logged-in device session; backs refresh-token rotation.

| column | type | notes |
|---|---|---|
| `id` | CHAR(36) PK | = JWT `sid` claim |
| `customer_id` | VARCHAR(64) | |
| `refresh_hash` | CHAR(64) | SHA-256 of the opaque refresh token (PRD §11.2) |
| `family_id` | CHAR(36) | rotation family; reuse of a rotated token revokes the whole family |
| `device_id` | CHAR(36) NULL | FK → `devices.id` |
| `expires_at` | DATETIME | now + `REFRESH_TTL_DAYS` (30) |
| `rotated_at` | DATETIME NULL | set when this token is rotated out |
| `revoked_at` | DATETIME NULL | set on logout / theft detection / deletion |
| `created_at` | DATETIME | |

Indexes: `(refresh_hash)` unique, `(customer_id)`, `(family_id)`.

**`devices`** — one row per registered device (push token is Phase 2).

| column | type | notes |
|---|---|---|
| `id` | CHAR(36) PK | |
| `customer_id` | VARCHAR(64) | |
| `platform` | ENUM('ios','android') | |
| `model` | VARCHAR(100) NULL | |
| `app_version` | VARCHAR(20) NULL | |
| `push_token` | VARCHAR(255) NULL | Phase 2 (`expo-notifications`) |
| `created_at` / `last_seen_at` | DATETIME | |

Index: `(customer_id)`.

**`deletion_requests`** — account-deletion requests (PRD §8.10, `DELETE /v1/me`). We never
delete client loan data (regulatory retention); we only record the request + revoke our sessions.

| column | type | notes |
|---|---|---|
| `id` | CHAR(36) PK | returned as `requestId` |
| `customer_id` | VARCHAR(64) | |
| `status` | ENUM('RECEIVED','HANDLED') | |
| `requested_at` / `handled_at` | DATETIME | |
| `handled_by` | VARCHAR(64) NULL | staff ref when actioned out-of-band |

**`audit_log`** — security events (PRD §11.4). No OTPs, tokens, names, or amounts ever.

| column | type | notes |
|---|---|---|
| `id` | BIGINT AUTO PK | |
| `ts` | DATETIME | |
| `event` | VARCHAR(50) | `otp_requested`,`otp_verified`,`otp_failed`,`login`,`logout`,`refresh_reuse`,`deletion_requested` |
| `customer_id` | VARCHAR(64) NULL | opaque |
| `ip` | VARCHAR(45) NULL | |
| `device_id` | CHAR(36) NULL | |
| `request_id` | CHAR(36) NULL | |
| `meta_json` | JSON NULL | safe metadata only |

**Scheduled cleanup:** purge consumed/expired `otp_requests` after 24h; expired `sessions`
after 60 days (a periodic job; can start as a manual script).

### 6.2 Client data (we do NOT own)

- **Demo:** no database — `MockLoanRepository` returns fixtures (PRD Appendix C).
- **Live:** the client's **API** (or, if ever offered instead, a read-only MySQL via views).
  We hold **no copy** of client loan data; every request reads live. Our internal view of it is
  the `*Record` types (§7.1) produced by the ACL translator — never the client's raw shape.

### 6.3 `client_db` in local Docker

The local `client_db` schema + `app_ro` user exist so the `SHOW GRANTS` read-only boot guard
has something to check and so a future `MysqlLoanRepository` can be developed if direct DB
access ever happens. For the demo it is otherwise unused (we serve mock data). Seed is fake only.

---

## 7. The data layer contract (the seam between us and the client)

### 7.1 Internal record types (our side of the ACL)

The repository returns these **internal** types. They are ours, stable, and already shaped for
our DTOs. The client's API shape is translated *into* these; nothing downstream sees anything
else. (Defined in `src/repositories/LoanRepository.ts`, using `@app/shared` scalar types.)

- `CustomerRecord` — `{ customerId, fullName, mobileE164, email?, city?, photoUrl? }`
- `LoanRecord` — loan terms + raw financials in **paise** + `internalStatus` (raw, mapped to
  ACTIVE/OVERDUE/CLOSED by the DTO layer, PRD Q8) + `totalInstallmentPaidPaise`.
- `LoanChargesRecord` — `{ lateFeePaise, overdueInterestPaise, recoveryChargesPaise,
  discountPaise, adjustedPaise }` — **always read from source, never computed** (PRD Q7).
- `TransactionRecord`, `InstallmentRecord?` (optional; only if source has a schedule table/endpoint).
- `Page<T>` — cursor paging envelope.

### 7.2 Repository interface — PRD §14.2 (already in code)

```ts
interface LoanRepository {
  findCustomersByMobile(mobileE164: string): Promise<CustomerRecord[]>; // auth; expects exactly 1
  getCustomer(customerId: string): Promise<CustomerRecord | null>;
  listLoans(customerId: string): Promise<LoanRecord[]>;
  getLoan(customerId: string, loanId: string): Promise<LoanRecord | null>;      // MUST filter by customer
  getLoanCharges(customerId: string, loanId: string): Promise<LoanChargesRecord>;
  listInstallments?(customerId: string, loanId: string): Promise<InstallmentRecord[]>; // if source has it
  listTransactions(customerId, loanId, page): Promise<Page<TransactionRecord>>;
  sumPayments(customerId, loanId): Promise<{ onlinePaise; cashPaise; totalPaise }>;
}
```

**Invariants that hold for every implementation:**
- Every loan-scoped method takes `customerId` first and MUST filter by it (PRD A3). No fetch by
  `loanId` alone. Cross-customer access returns `null` → surfaced as `404` (never `403`).
- Money is integer paise at the boundary; decimals from any source are converted with integer
  arithmetic, round-half-up (PRD §10.1).
- The repository returns `*Record`s only — DTO whitelisting happens above it (PRD A4).

### 7.3 Two implementations

**`MockLoanRepository` (demo — build now, A-05/06).** Serves PRD Appendix C fixtures: fake
customer `cu_demo1` (mobile `+919999900001`), one active/overdue partially-paid loan matching
the golden test (§12.4), one closed loan, 40+ transactions summing exactly to the paid total.
Derives schedule/summary via `@app/shared` so fixture numbers satisfy the invariants. Supports a
fixed demo OTP `123456` path (via `OTP_DEV_MODE`) for the store-review demo account (PRD §16.3).

**`ClientApiLoanRepository` (live — build when the client delivers their API).** The ACL:
- *Facade* (`client/ClientApiFacade.ts`): holds the client base URL + our credential to their
  API (`CLIENT_API_BASE_URL`, `CLIENT_API_KEY`), does the HTTPS calls, retries/timeouts, maps
  transport failures to `UPSTREAM_DB_UNAVAILABLE`. Only file that knows their endpoints.
- *Translator* (`client/clientTranslator.ts`): the single place mapping their response → our
  `*Record` types; all field renames, enum/status maps, and decimal→paise conversions live here.
- *Adapter* (`client/ClientApiLoanRepository.ts`): implements `LoanRepository` by composing the
  two; enforces the `customerId` filter even if the client API is lenient.

When the client API arrives, filling these three files + env is the whole live integration.
`docs/DB_MAPPING.md` becomes the **field-mapping** reference for the translator (what their field
is called → our record field), still human-filled, still never guessed.

---

## 8. The API we expose (surface summary)

Full request/response shapes live in PRD §10.3–§10.4 and will be codified in
`contracts/openapi.yaml` (F-03). This is the build checklist with auth + source notes.

| Method & path | Auth | Reads from | Task | Notes |
|---|---|---|---|---|
| `GET /v1/health` | public | — | A-01 ✅ | liveness |
| `GET /v1/health/ready` | public | appDb (+client later) | A-01 ✅ | readiness ping |
| `GET /v1/config` | public | env | A-01 ✅ | computes `updateRequired` from `X-App-Version`/`X-Platform` |
| `POST /v1/auth/otp/request` | public, rate-limited | repo (find by mobile) + appDb + SMS | A-04 | always returns same shape (anti-enumeration, PRD §10.4) |
| `POST /v1/auth/otp/verify` | public, rate-limited | appDb + repo (customer) | A-04 | issues JWT + refresh; returns `me` |
| `POST /v1/auth/refresh` | public | appDb (sessions) | A-04 | rotating; reuse revokes family |
| `POST /v1/auth/logout` | auth | appDb | A-04 | `204` |
| `GET /v1/me` | auth | repo (customer) | A-09 | `Me` DTO |
| `DELETE /v1/me` | auth | appDb | A-09 | `202`; records deletion, revokes sessions; never deletes client data |
| `GET /v1/loans` | auth | repo | A-08 | list + `totals` (active/overdue only) |
| `GET /v1/loans/{loanId}` | auth | repo | A-08 | `LoanDetail`; outstanding invariant must hold |
| `GET /v1/loans/{loanId}/schedule` | auth | repo + ScheduleProvider | A-08 | all installments; optional `?status=` filter |
| `GET /v1/loans/{loanId}/transactions` | auth | repo | A-08 | cursor paging, newest first |
| `POST /v1/devices` / `DELETE /v1/devices/{id}` | auth | appDb | Phase 2 | push registration |

Conventions (PRD §10.1, §13): base path `/v1`; integer-paise money fields end in `Paise`; dates
`YYYY-MM-DD` (IST); `Authorization: Bearer` on all but `/auth/*`,`/config`,`/health`; echo
`X-Request-Id`; `Cache-Control: no-store` on authenticated routes; 10 KB body cap; CORS disabled.
Error envelope + codes exactly per PRD §10.2 (already implemented in `lib/errors.ts`).

---

## 9. Services to build (ordered, with acceptance)

Maps to PRD §20 task IDs. Each is "done" only per PRD §21.1 Definition of Done (tests, lint,
typecheck, docs, no secrets/PII).

1. **A-02 — `mobile_app` migrations.** Knex migrations creating the five tables in §6.1 with
   indexes. *Done:* `migrate:latest` and `migrate:rollback` run cleanly on docker MySQL; tables
   + indexes verified.
2. **A-03 — SMS provider.** ✅ interface done; finish `Msg91Provider.sendOtp` against the DLT
   template when the client supplies it. *Done:* OTP value never logged; console provider works
   in dev.
3. **A-05/A-06 — Mock repository + fixtures + DTO mappers + blacklist test.** `MockLoanRepository`
   serving Appendix C; whitelist mappers (`toMeDto`, `toLoanSummaryDto`, `toLoanDetailDto`,
   `toInstallmentDto`, `toTransactionDto`); a contract test that scans every response's keys
   against Appendix B and fails on any blacklisted key. *Done:* cross-customer returns 404;
   blacklist test green; outstanding invariant holds on fixtures.
4. **A-04 — Auth module + app-DB repos.** OTP request/verify (HMAC store, constant-time compare,
   expiry, attempts, resend, per-mobile/per-IP limits), JWT issue, refresh rotation + reuse
   detection, logout, audit-log writes. *Done:* every behaviour in PRD §11 covered by
   integration tests; secrets-absent boot refusal already enforced.
5. **A-07 — Schedule wiring.** ✅ `ComputedScheduleProvider` exists; wire it into `/schedule` and
   loan-summary derivation; keep `DbScheduleProvider` as a stub for when the client has a
   schedule source. *Done:* `/schedule` for fixture loan equals the golden expectations (§12.4).
6. **A-08 — Loan endpoints.** `/loans`, `/loans/:id`, `/schedule`, `/transactions` via services
   → repo → mappers. *Done:* contract-valid; invariants hold; deterministic ordering.
7. **A-09 — `/me`, `DELETE /me`, `/config`.** *Done:* deletion returns 202, revokes sessions,
   writes audit, leaves client data untouched.
8. **F-03 — Fill `openapi.yaml`** from PRD §10 and generate/validate types into `@app/shared`.
   *Done:* spec validates; a response contract test passes; CI fails on drift.
9. **A-10 — Docker/compose/DB_ACCESS finalisation + deployment doc.** *Done:* `docker compose up`
   gives a working local stack (already close); GRANTs documented.
10. **A-11 — Load test** at target capacity (p95 < 500 ms, 500 concurrent). PRD §17.
11. **LIVE — `ClientApiLoanRepository` (ACL).** Build when the client API arrives: facade +
    translator + adapter + `DATA_SOURCE=client_api` wiring; fill `DB_MAPPING.md` as the field map.
    *Done:* same cross-customer + blacklist + invariant tests pass against a recorded/sandbox
    client API; flipping `DATA_SOURCE` needs no change to services/routes/mobile.

---

## 9.1 OpenAPI approach (decision needed, default chosen)

Two viable paths; **default: generate the spec from zod** so validation and contract never drift
(a recurring 2026 recommendation for Express + TS APIs — content rephrased for compliance):

- **Default — zod-first:** define request/response schemas in zod, derive `openapi.yaml` with
  `@asteasolutions/zod-to-openapi`. One source of truth; validation and docs stay in sync.
- **Alternative — spec-first:** hand-write `openapi.yaml`, validate requests at runtime with
  `express-openapi-validator`, generate TS types for `@app/shared`.

Either keeps the PRD's "contract-first" intent. Pick one in `DECISIONS.md` before F-03; the rest
of the spec is unaffected.

---

## 10. Security & compliance (backend-relevant, PRD §11, §15.1, §16)

- **Per-customer scoping (A3):** `customerId` comes from the verified JWT only; it is the
  mandatory first arg to every loan-scoped repo call. Cross-customer access → `404`. An
  integration test (customer A requests B's loan/schedule/transactions → 404 each) MUST exist.
- **Whitelist out (A4) + blacklist test:** responses built only by DTO mappers; a test scans
  response keys against PRD Appendix B (agent names, guarantor, KYC, internal status codes, DB
  column names, payment instruments, …) and fails on any match.
- **Secrets & boot guards (S2/S10):** zod-validated env, fail-fast; refuse prod boot if
  `OTP_DEV_MODE=true`, secrets < 32 bytes, or (direct-DB mode) the client user has write grants.
  All implemented in `config/env.ts` + `db/clientDb.ts`.
- **OTP (§11.1):** 6-digit, HMAC-stored, 5-min expiry, 3 attempts, constant-time compare, resend
  after 30 s, ≤5/mobile/hr and ≤20/IP/hr. Dev fixed OTP `123456` only when `OTP_DEV_MODE=true`
  and not production.
- **Tokens (§11.2):** JWT access 15 min (`sub`,`sid`,`iat`,`exp`; no PII); refresh 256-bit
  opaque, SHA-256-hashed in `sessions`, rotating, family-revoke on reuse.
- **Logging (S8):** request id, route, status, latency, opaque customerId only. Never mobile,
  OTP, token, name, or amount. pino redaction is the backstop.
- **Transport:** HTTPS only in deployment; rate limits (global 120/min/IP, 60/min/customer on
  data routes, tighter on auth); helmet headers; `X-Powered-By` disabled; 10 KB body cap; CORS off.
- **Live-phase ACL:** our credential to the client's API is a server-only secret (never in the
  app); we send only the authenticated customer's identifier upstream; we still re-filter by
  `customerId` on the way back.

---

## 11. Environments & configuration

| Env | `DATA_SOURCE` | Serves | Notes |
|---|---|---|---|
| Local demo | `mock` | fixtures | no client dependency; what we build/test on now |
| Staging/review | `mock` or `client_api` | fixtures or client sandbox | store-review demo account uses isolated fake data (PRD §16.3) |
| Production | `client_api` | client's live API | our API + `mobile_app` DB hosted in an Indian region (PRD §6.3, §16 C5) |

New env vars this spec introduces (add to `apps/api/.env.example` when implemented):

```
DATA_SOURCE=mock|client_api|mysql        # repository selection (default mock)
# live phase only:
CLIENT_API_BASE_URL=                     # client's API root
CLIENT_API_KEY=                          # our server-side credential to the client (never in the app)
CLIENT_API_TIMEOUT_MS=5000
```

Everything else is the PRD §19.3 set, already in `.env.example` (DB, JWT/OTP secrets, SMS,
lender/support/grievance, store/version, maintenance, Sentry).

---

## 12. Testing (PRD §18.1)

- **Unit:** DTO mappers (whitelist), OTP hashing, config/env guards, schedule derivation (reuses
  `@app/shared` golden tests), money/date already covered in `@app/shared`.
- **Integration (docker MySQL):** full auth flow, refresh rotation + reuse detection, rate
  limiting, OTP expiry/attempts, `/loans`,`/loans/:id`,`/schedule`,`/transactions` paging.
- **Security (MUST):** cross-customer → 404; blacklist key scan; invalid/expired/tampered JWT
  rejected; SQL/param-injection harmless; prod boot guards.
- **Invariant:** `outstanding = payable + lateFee + overdueInterest + recoveryCharges − discount
  − adjusted − totalPaid`; `installmentsPaid + installmentsRemaining == totalInstallments`.
- **Contract:** responses validate against `openapi.yaml`.
- **ACL (live):** translator mapping tests against recorded client sample payloads (fake data).

---

## 13. Open questions routed to the client (backend-specific)

These block the **live** phase, not the demo. The demo proceeds on mock data regardless.

1. **Client API shape:** base URL, auth scheme (API key / OAuth / mTLS), endpoints for
   customer-by-mobile, loans, loan detail, charges, transactions, and (if any) an installment
   schedule. → fills the ACL facade + `DB_MAPPING.md` field map.
2. **Customer identity (PRD Q4):** which field identifies a customer by mobile; can a number map
   to multiple customers (we fail login if 0 or >1).
3. **Field map (PRD §14.3):** exact source field → our record field for every item, incl. how
   charges and "installment paid total" are represented, and status values to map (Q7/Q8).
4. **Schedule (PRD Q3):** does the client expose an installment schedule, or do we compute it?
5. **Pay-frequency + weekly-off (Q5):** enum values and whether weekly-off is provided per loan.
6. **SMS/DLT (Q10):** provider, DLT template id, sender id for `Msg91Provider`.
7. **Hosting (Q11, C5):** can our API + `mobile_app` DB sit in the client's network/region;
   is the client API reachable from there over HTTPS.

Record each answer in `DECISIONS.md`; never guess a mapping (PRD rule 5).

---

## 14. Glossary (backend)

- **ACL (Anti-Corruption Layer):** the facade+translator+adapter boundary isolating our domain
  from the client's API shape.
- **`DATA_SOURCE`:** env switch selecting the `LoanRepository` implementation.
- **`*Record`:** our internal data types; the only thing a repository returns.
- **DTO:** customer-safe response object produced by a whitelist mapper; the only thing a route returns.
- **`mobile_app`:** the one schema we own (OTP, sessions, devices, deletion, audit).
- See PRD Appendix D for domain terms (NBFC, EMI, paise, IST, DLT, outstanding).
```
