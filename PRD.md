# PRD: Customer Loan App for NBFC

| | |
|---|---|
| **Version** | 1.1 (Draft) |
| **Date** | 2026-10-02 |
| **Audience** | AI coding agents and human developers |
| **Product name** | `<APP_NAME>` (placeholder, client to confirm) |
| **Lender (legal entity)** | `<NBFC_LEGAL_NAME>` (placeholder) |
| **Platforms** | Android (Google Play) and iOS (App Store) |
| **Product type** | **Read-only loan tracker.** No money moves through the app, in any phase. |

**Changes in v1.1:** product positioned as a **tracker only** (all payment features removed from every phase); store/regulatory classification questions added (Q16 to Q18, Section 16.5); Google Play and Apple sections corrected; optional APR / Key Fact Statement block added; store review-notes templates added (Appendix F); tasks R-06 and R-07 added.

---

## 0. How to use this document (instructions for coding agents)

1. **Order of authority:** this PRD, then `contracts/openapi.yaml` (once created from Section 10), then code comments.
2. **Keywords:** MUST / MUST NOT = mandatory. SHOULD = default unless there is a documented reason. MAY = optional.
3. **Build in phases (Section 4).** Do not start Phase N+1 until all Phase N acceptance criteria pass.
4. **Items tagged `[OPEN]`** are unanswered questions for the client. Each has a **default**. Implement the default, isolate it behind config or an adapter, and do not block on it.
5. **Never invent the client's database schema.** Use the repository interfaces (Section 14) with mock/fixture implementations until the real mapping table (Section 14.3) is filled in by a human.
6. **Never commit** secrets, `.env` files, real customer data, or screenshots of the client's web app.
7. **Contract first:** change `openapi.yaml` before changing endpoints or client code, and regenerate types.
8. **Money is always integer paise.** No floating-point money anywhere (Section 10.1).
9. Work in small, reviewable commits. Every task in Section 20 has acceptance criteria. A task is done only when they pass and tests exist.
10. When something is ambiguous and not covered here, pick the safest option (the more private, more secure, simpler one), note it in `docs/DECISIONS.md`, and continue.
11. **Scope guard (tracker only):** the app MUST NOT contain any payment feature (payment button, payment link, payment gateway, UPI intent, QR code, bank details), any loan application or loan offer, any marketing or ads, any third-party lender content, or any collection/recovery action. If a task seems to require one, stop and flag it in `docs/DECISIONS.md` instead of building it.

---

## 1. Product overview

### 1.1 Context
`<NBFC_LEGAL_NAME>` is an Indian non-banking finance company that lends to individual customers (small-ticket loans with **daily, weekly or monthly** repayment collected by field agents and online). The company already runs an internal **staff web app** backed by a **MySQL** database. It holds customers, loan accounts, EMI terms, payments (cash and online), charges, and internal notes.

### 1.2 Problem
Customers cannot see their own loan status. They call or visit the branch to ask the outstanding amount, how many EMIs are paid, and what is due next. This is a load on staff and a poor customer experience.

### 1.3 Solution
A **customer-facing mobile app** (Android and iOS) where a customer logs in with OTP and sees their loans. For each loan the app shows balance, repayment progress (paid vs. remaining EMIs and their due dates), charges, and payment history. The app is **read-only** and is a **tracker only**: it displays information and never moves money. It reads from the client's existing MySQL database **through a secure API**. The app never connects to the database directly.

### 1.4 Key principle: customer-safe data only
The internal web app shows much more than a customer should see (agent names, internal remarks, guarantor liability, KYC status, route numbers and so on). The API MUST expose only an explicit whitelist of fields (Section 10 and Appendix B).

### 1.5 Product positioning: tracker only (applies to every phase)
The app is a **read-only account viewer for existing customers** of `<NBFC_LEGAL_NAME>`.
- It **does**: show loans, balances, EMI schedule, charges, payment history, lender and support details.
- It **does not**: offer or advertise loans, take loan applications, disburse funds, accept or initiate payments, link to payment pages, display payment QR codes or UPI IDs, perform collection or recovery actions, upload KYC, or share data with third parties.
- This positioning MUST be stated consistently in the store listings, review notes (Appendix F), the in-app footer disclaimer (Section 8.6), and the privacy policy. It exists to keep store review simple. It does not by itself remove the need for the client's compliance review (Section 16.5).

---

## 2. Goals, non-goals, success metrics

### 2.1 Goals
- G1. A customer can log in with their registered mobile number via OTP.
- G2. A customer can see all their loan accounts and, for each, the accurate outstanding balance, charges, EMI details, next due date, and last payment.
- G3. A customer can see which EMIs are paid, partial, overdue, and upcoming, with dates.
- G4. A customer can see full payment history.
- G5. The app is secure by design (no direct DB access, strict per-customer data scoping) and ready for review on both stores.
- G6. Numbers in the app MUST match the numbers in the client's web app.

### 2.2 Non-goals (Phase 1)
**Out of scope in every phase:** any payment functionality (in-app payment, payment gateway, UPI, "Pay now" button or link to a payment page), loan applications, loan offers or marketing, disbursal, collection or recovery actions, KYC/document upload, third-party lender content, advertising.
**Out of scope for Phase 1 only:** chat, editing any data, guarantor view, staff or agent features, tablet-optimised layouts, web version, multi-language (planned for Phase 2 but i18n is built from day one).

### 2.3 Success metrics (targets to confirm with client)
| Metric | Target |
|---|---|
| Login success rate (OTP delivered and verified) | ≥ 95% |
| Crash-free sessions | ≥ 99.5% |
| API p95 latency (loan endpoints) | < 500 ms |
| Data mismatch vs. web app (QA sample) | 0 |
| Customers registered within 60 days of launch | `[OPEN]` set by client |

---

## 3. Users

| User | Description | In the app? |
|---|---|---|
| **Borrower (customer)** | Individual with one or more loan accounts. Often mid-range Android phone, intermittent network, may prefer Hindi, may be less comfortable with technology. | Yes, the only user |
| Client staff / admin | Uses the existing web app | No |

**Design implications:** large readable text, simple flows, minimal typing, clear status colours and words (not only colours), works on slow networks, supports system font scaling.

---

## 4. Scope and phases

| Phase | Name | Contents |
|---|---|---|
| **0** | Foundation | Repo, tooling, contract, shared utils, **mobile app running fully on mock data**, schedule calculator with tests |
| **1** | MVP (store-ready) | Real API + OTP auth, home (loan list), loan detail, repayment schedule, transaction history, profile, settings, support, account deletion request, app lock, app config (force update / maintenance), store submission assets |
| **2** | Engagement | Push notifications (EMI due reminders, payment recorded), Hindi localisation, encrypted offline cache |
| **3** | Documents (optional) | Statement PDF and NOC download, only if the client wants them. **Payments are never part of this app.** |

This PRD specifies Phases 0 and 1 in full detail, Phase 2 in moderate detail, and Phase 3 at outline level. Payments are out of scope in every phase.

---

## 5. Assumptions and open questions

Agents: implement the **Default** and keep it configurable.

| ID | Question for client | Default (implement this) |
|---|---|---|
| Q1 | Is the web app custom-built or third-party software? Does it have an API? | Assume custom, no usable API. Build a separate API reading MySQL through repository interfaces. |
| Q2 | Web app backend language/framework? | Irrelevant to the default design. The API is a separate Node.js service. |
| Q3 | Does the DB have a repayment-schedule (installment) table? | No. Compute the schedule (Section 12) behind `ScheduleProvider`. If the table exists, use `DbScheduleProvider`. |
| Q4 | Which mobile number identifies a customer (Mobile vs. Tel)? Can multiple customer records share a number? | Match **primary mobile only**. If 0 or more than 1 customer matches, login fails with the generic message and an internal log entry. |
| Q5 | How are "Weekly Off" days and holidays handled in schedules? | Support an optional per-loan weekly-off weekday. Ignore holidays. |
| Q6 | How is payment allocated to EMIs? | FIFO, oldest unpaid EMI first. |
| Q7 | How are late fee, overdue interest and recovery charges calculated? | **Never calculated by us.** Read stored values from the DB. |
| Q8 | Which loan statuses exist internally? | Map to customer-facing `ACTIVE`, `OVERDUE`, `CLOSED`. Internal statuses such as NPA or legal are never exposed (show `OVERDUE`). |
| Q9 | Should the app say how customers can pay? | **Payments are out of scope.** Only static, non-interactive text supplied by the client in the Help FAQ (e.g. "visit your branch or contact your collection agent"). No payment links, QR codes, UPI IDs, or bank details anywhere in the app. |
| Q10 | SMS provider for OTP and DLT registration? | `SmsProvider` interface with `Msg91Provider` and `ConsoleProvider` (dev only). DLT registration done by the client. |
| Q11 | Where are the web app and MySQL hosted? | Host the API in the same private network or VPC as MySQL, in an Indian region. MySQL is never publicly exposed. |
| Q12 | Brand assets (logo, colours, fonts), app name, bundle IDs? | Neutral theme with tokens (Section 6.4). Bundle ID placeholder `com.example.loanapp`. |
| Q13 | Support contacts, grievance officer, RBI registration number, privacy policy URL, terms URL? | Provided via `GET /v1/config`. Placeholders in dev. |
| Q14 | Staging DB copy with anonymised data available? | Use fixtures and the mock repository until provided. |
| Q15 | Should customers see guarantor loans? | No. Not in scope. |
| Q16 | Does the client's compliance team consider this tracker a Digital Lending App that must be reported on RBI's CIMS portal? Is the NBFC already reporting other apps there? | Assume it **may** be in scope. No code impact. Store submission is gated on a written answer (task R-06). Reporting it anyway is recommended (Section 16.5). |
| Q17 | Does the client have an APR and Key Fact Statement (KFS) per loan that can be shown? | Optional `keyFacts` block (Section 8.6 and 10.3). Hidden when data is absent. |
| Q18 | How does Google Play classify a servicing-only tracker (personal loan app or not)? | Declare accurately as an account viewer that offers no loans or payments. Ask Play support before first submission and record the answer in `docs/DECISIONS.md`. |

---

## 6. Technology decisions

### 6.1 Mobile
| Concern | Choice |
|---|---|
| Framework | **React Native with Expo** (latest stable SDK at project creation), **TypeScript strict** |
| Build and release | **EAS Build** and **EAS Submit** |
| Navigation | **Expo Router** (file-based) |
| Server state | **TanStack Query** |
| Client state | React Context or Zustand (auth/session, app lock, UI prefs only) |
| Forms and validation | `react-hook-form` and `zod` |
| Secure storage | `expo-secure-store` (tokens only) |
| Biometrics | `expo-local-authentication` |
| Push (Phase 2) | `expo-notifications` (FCM and APNs) |
| In-app browser | `expo-web-browser` (legal pages and KFS document only) |
| Lists | `@shopify/flash-list` for long lists |
| i18n | `i18next`, `react-i18next`, `expo-localization` |
| Error monitoring | Sentry (`sentry-expo` or `@sentry/react-native`), PII scrubbing ON |
| Lint/format | ESLint, Prettier |
| Tests | Jest, React Native Testing Library, Maestro (E2E flows) |

### 6.2 Backend API (default; replace only if the client has a reusable backend, and keep the contract)
| Concern | Choice |
|---|---|
| Runtime | Node.js LTS, TypeScript strict |
| Framework | **Fastify** |
| Validation | `zod` (request/response schemas) |
| Client DB access | `mysql2` with a pooled, **read-only** connection, parameterised queries only |
| App-owned DB | A **separate schema** (`mobile_app`) on the same MySQL server (or separate instance) with its own user, for OTP records, sessions, devices, deletion requests, audit log. Migrations via **Knex**. |
| Auth | OTP then JWT access token (15 min) and rotating refresh token (30 days) |
| Logging | `pino`, structured, **no PII**, request IDs |
| Rate limiting | `@fastify/rate-limit` |
| Tests | Vitest (or Jest) and supertest; MySQL via docker-compose for integration tests |
| Container | Docker |

### 6.3 Infrastructure
- Host in **India** (e.g. AWS `ap-south-1`) or alongside the client's existing servers. Confirm with client compliance.
- HTTPS only (TLS 1.2+). Reverse proxy (Nginx/ALB) in front of the API.
- MySQL reachable only from the API's private network. **Port 3306 is never open to the internet.**
- Automated backups for the app-owned schema, uptime monitoring, centralised logs.

### 6.4 Design tokens (neutral until brand assets arrive)
Define in `apps/mobile/src/constants/theme.ts` (the SDK 57 template's theme file) as the
`App*` exports (`AppColors`, `AppSpacing`, `AppRadius`, `AppTypography`, `StatusColorRole`),
consumed via `useAppTheme()` in `src/hooks/use-theme.ts`. (The template already ships this
file and its starter screens import from it, so tokens live here rather than a separate
`src/theme/tokens.ts` — see `docs/DECISIONS.md`.) Do not hardcode colours or sizes in
components.
- Colours: `primary`, `onPrimary`, `background`, `surface`, `textPrimary`, `textSecondary`, `border`, `success`, `warning`, `danger`, `info`. Light and dark variants (follow system setting).
- Status colour mapping: PAID = success, PARTIAL = warning, OVERDUE = danger, DUE_TODAY = info, UPCOMING = neutral. Always pair colour with a text label and an icon.
- Typography: system font, scalable. Minimum body size 16. Respect OS font scaling up to 200% without clipping.
- Touch targets ≥ 44 x 44 pt. Spacing scale 4/8/12/16/24/32.

---

## 7. Architecture

```
┌──────────────────────┐   HTTPS + JWT   ┌──────────────────────────┐
│  Mobile app (Expo)   │ ──────────────▶ │  API (Fastify, Node)      │
│  Android / iOS       │                 │  - auth (OTP, JWT)        │
│  in-memory data only │ ◀────────────── │  - customer-safe DTOs     │
└──────────────────────┘                 │  - schedule computation   │
                                         └──────┬─────────────┬──────┘
                              read-only user    │             │ read/write user
                                                ▼             ▼
                                   ┌────────────────┐  ┌──────────────────┐
                                   │ Client MySQL   │  │ App-owned schema │
                                   │ (loans, txns)  │  │ (otp, sessions,  │
                                   │ NOT public     │  │  devices, audit) │
                                   └────────────────┘  └──────────────────┘
                                         SMS provider ◀── API (OTP delivery)
```

### 7.1 Architectural rules
- A1. Mobile talks **only** to the API. No DB credentials, no SQL, no third-party keys with write power in the app.
- A2. The API talks to client data **only** through repository interfaces. No SQL outside `repositories/`.
- A3. Every client-DB query MUST include the authenticated `customerId` in its `WHERE` clause. No repository method may fetch a loan by `loanId` alone.
- A4. API responses are built from **explicit DTO mappers** (whitelist). Never spread or serialise raw DB rows.
- A5. The API never writes to the client's database in Phases 1 and 2.
- A6. The mobile app has a swappable API layer: `EXPO_PUBLIC_API_MODE=mock|live`.
- A7. No payment, loan-application, offers/marketing, ads, or third-party-lender code exists in either codebase (scope guard, Section 0 rule 11). No payment SDKs may be added as dependencies.

### 7.2 Repository structure
```
loan-app/
├── PRD.md
├── docs/
│   ├── DECISIONS.md              # log of assumptions/decisions made by agents
│   └── DB_MAPPING.md             # filled in by a human once schema is known (Section 14.3)
├── contracts/
│   └── openapi.yaml              # single source of truth for the API
├── shared/                       # npm workspace "@app/shared"
│   └── src/
│       ├── types/                # generated from openapi + hand-written domain types
│       ├── money.ts              # paise helpers, formatINR
│       ├── dates.ts              # IST helpers, date math
│       ├── schedule.ts           # schedule calculator (pure functions)
│       └── schedule.test.ts      # golden tests (Section 12.4)
├── apps/
│   ├── mobile/
│   │   ├── app/                  # Expo Router routes (Section 8)
│   │   │   ├── _layout.tsx
│   │   │   ├── (auth)/login.tsx
│   │   │   ├── (auth)/otp.tsx
│   │   │   ├── (app)/(tabs)/index.tsx          # Home
│   │   │   ├── (app)/(tabs)/profile.tsx
│   │   │   ├── (app)/loan/[loanId]/index.tsx   # Overview
│   │   │   ├── (app)/loan/[loanId]/schedule.tsx
│   │   │   ├── (app)/loan/[loanId]/history.tsx
│   │   │   ├── (app)/settings.tsx
│   │   │   ├── (app)/help.tsx
│   │   │   ├── (app)/legal.tsx
│   │   │   ├── update-required.tsx
│   │   │   └── maintenance.tsx
│   │   ├── src/
│   │   │   ├── components/       # UI primitives and feature components
│   │   │   ├── features/         # auth, loans, transactions, profile hooks and queries
│   │   │   ├── services/
│   │   │   │   ├── api/          # client.ts, live adapter, mock adapter, fixtures
│   │   │   │   ├── secureStorage.ts
│   │   │   │   └── appLock.ts
│   │   │   ├── i18n/             # en.json (hi.json in Phase 2)
│   │   │   ├── theme/
│   │   │   └── utils/
│   │   ├── app.config.ts
│   │   ├── eas.json
│   │   └── .env.example
│   └── api/
│       ├── src/
│       │   ├── server.ts, app.ts
│       │   ├── config/env.ts     # zod-validated env
│       │   ├── modules/          # auth, me, loans, devices, config, health
│       │   ├── repositories/     # LoanRepository (mysql + mock implementations)
│       │   ├── adapters/sms/     # SmsProvider (msg91, console)
│       │   ├── schedule/         # ScheduleProvider (computed, db)
│       │   ├── db/               # clientDb.ts (read-only), appDb.ts, migrations/
│       │   └── lib/              # errors, logger, ids, crypto
│       ├── test/
│       ├── Dockerfile
│       └── .env.example
├── docker-compose.yml            # local MySQL (client-like seed) and app schema
├── package.json                  # npm workspaces
└── .github/workflows/ci.yml
```

---

## 8. Functional requirements: mobile screens

### 8.0 Global behaviour
- **Navigation:** logged-out users see only `(auth)` routes. Logged-in users see `(app)` routes. Bottom tabs: **Home**, **Profile**. Loan detail is a stack screen with a segmented control: **Overview | Schedule | History**.
- **Loading:** skeleton placeholders, never a blank screen. **Errors:** inline message and "Try again" button. **Offline:** persistent banner "You're offline", retry on reconnect.
- **Pull-to-refresh** on Home, Loan Overview, Schedule, History.
- **"Last updated"** text on loan screens from API `asOf` (e.g. "Updated 19 Sep 2026, 10:30 AM").
- **Formatting:** currency uses Indian digit grouping with the rupee sign (`₹1,33,167`, `₹94,167`). Dates display as `15 Jun 2026`. All "today" logic uses **IST (Asia/Kolkata)**. Use `formatINR(paise)` and `formatDate(iso)` from `@app/shared` everywhere.
- **Session expiry:** if refresh fails, clear tokens, go to Login with a "Session expired, please log in again" message.
- **Privacy:** no financial data in logs, analytics or crash reports. Mask mobile numbers (`+91 98XXXXX002`) outside Profile. On Android, `FLAG_SECURE` for sensitive screens SHOULD be configurable via remote config (default off).
- **In-memory data only (Phase 1):** do not persist financial data to disk (no AsyncStorage/MMKV caching of loan data). Only the refresh token is persisted (SecureStore).
- **Accessibility:** every interactive element has an accessibility label. Status is announced as text. Support screen readers and font scaling.

### 8.1 S1: Boot / Splash
1. Show splash. Call `GET /v1/config`.
2. If `updateRequired` is true, go to **Update Required** (S14). If `maintenance` is true, go to **Maintenance** (S15).
3. Read the refresh token from SecureStore. If present, attempt refresh, then if app lock is enabled go to **Unlock** (S4b), else Home. If absent or refresh fails, go to Login.

### 8.2 S2: Login (mobile number)
- Elements: app logo, lender name, title "Log in", a **+91** prefix label, a 10-digit mobile input (numeric keypad, `maxLength=10`), a **Send OTP** button, and links to Privacy Policy and Terms.
- Validation: Indian mobile `^[6-9]\d{9}$`. Inline error "Enter a valid 10-digit mobile number".
- Action: `POST /v1/auth/otp/request`. On success go to OTP screen (pass `otpRequestId`, masked mobile).
- On 429 show "Too many attempts. Try again in {n} minutes."
- Copy MUST NOT reveal whether the number is registered. Use "If this number is registered with {Lender}, you will receive an OTP."

### 8.3 S3: OTP verification
- Six-box OTP input with `textContentType="oneTimeCode"` and `autoComplete="sms-otp"` (iOS and Android autofill). **Do NOT request `READ_SMS` or `RECEIVE_SMS` permissions.**
- Resend OTP button with countdown (default 30 s, from API `resendAfterSec`). Change number link.
- Action: `POST /v1/auth/otp/verify`. Success: store refresh token (SecureStore), keep access token in memory, load `/v1/me`, then go to **App Lock setup prompt** (first login only) then Home.
- Errors: wrong OTP shows "Incorrect OTP. {n} attempts left." Expired shows "OTP expired. Request a new one." Attempts exceeded returns to Login with a message.
- Help text: "Not receiving the OTP? Make sure you're using the mobile number registered with {Lender}. Contact support." (links to Help).

### 8.4 S4: App lock
**S4a: Setup prompt (first login only):** "Secure your app" asks to enable biometric or device-PIN unlock (`expo-local-authentication`). Buttons: Enable / Not now. Choice stored in SecureStore.
**S4b: Unlock screen:** shown on cold start and when returning from background after **> 60 seconds** (configurable) if enabled. Biometric prompt auto-starts. Fallback: "Log in with OTP" (clears session). After 5 failed attempts, force OTP login.

### 8.5 S5: Home (loan accounts)
**Data:** `GET /v1/loans`.
**Layout (top to bottom):**
1. Greeting: "Hello, {firstName}".
2. **Summary card:** "Total outstanding" (sum over active/overdue loans) and, if any, an overdue banner "Overdue EMIs: ₹X" (from `totals.overdueInstallmentsPaise`).
3. **Active loans** section: one **Loan Card** per ACTIVE/OVERDUE loan.
4. **Closed loans** section (collapsed by default, count shown) if any.

**Loan Card contents:**
- Account number (e.g. `A00001`), product/scheme name, status chip (Active / Overdue / Closed).
- Outstanding balance (large).
- Progress bar and text "32 of 100 EMIs paid".
- "Next due: ₹1,200 on 19 Sep 2026" (or "Due today"), or "Fully paid" for closed loans.
- Tap navigates to Loan Overview.

**States:** empty ("No loan accounts found. Contact support if you think this is a mistake."), error, loading skeleton.

### 8.6 S6: Loan Overview
**Data:** `GET /v1/loans/{loanId}`.
**Sections:**
1. **Header card:** account number, status chip, "Outstanding balance" (large), progress "32 of 100 EMIs paid, 68 remaining".
2. **Next due card:** amount and date (informational only). If `overdueInstallmentsPaise > 0` show a danger banner "₹75,000 overdue (63 EMIs)". **There is no payment button or link** on this screen or anywhere in the app.
3. **Loan details** (label/value rows): Loan account no., Scheme, Loan date, First EMI date, EMI amount and frequency ("₹1,200 daily"), Total EMIs, Maturity date, Branch, Last payment ("₹5,000 on 11 Sep 2026").
4. **Amount summary** (label/value rows, every charge on its own line, zero values still shown):
   - Loan amount (principal), Total interest
   - Total payable, + Late fee, + Overdue interest charge, + Recovery visit charges, - Discount / offer
   - **Total due** (bold), Total paid / credited (bold)
   - **Outstanding balance** (highlighted)
5. **Payment breakup:** "Paid so far": Online ₹X, Cash ₹Y (history only).
6. **Key facts (optional):** shown only if `keyFacts` is present in the response: APR (e.g. "APR: 36.5% p.a.") and a "View Key Fact Statement" link opening `keyFacts.kfsDocumentUrl` in the in-app browser. Hidden entirely when absent. Do not compute APR in the app or API.
7. Footer disclaimer (always visible): "This app shows your loan information only. Payments are not made in this app. Figures are as of {asOf}. For any discrepancy, contact {Lender} support."

### 8.7 S7: Repayment Schedule
**Data:** `GET /v1/loans/{loanId}/schedule`.
- Top summary chips: Paid (n), Partial (n), Overdue (n), Upcoming (n).
- Filter segmented control: **All | Paid | Pending | Overdue**.
- Virtualised list (FlashList). Row: EMI number, due date, EMI amount, status badge (icon and text). For PARTIAL show "Paid ₹600 of ₹1,200". For PAID show "Paid on {date}" if available.
- On open, auto-scroll so the next due EMI is visible. A **"Jump to next due"** floating button appears if scrolled away.
- Sticky section header per month (e.g. "September 2026") SHOULD be provided for daily schedules.

### 8.8 S8: Transaction History
**Data:** `GET /v1/loans/{loanId}/transactions?cursor=&limit=20`.
- Grouped by month. Row: date, mode icon (online/cash), type label (Payment / Charge / Discount / Adjustment), amount with sign and colour, reference number if any.
- Infinite scroll via `cursor`. Pull-to-refresh. Empty state "No transactions yet".
- Tap a row opens a **bottom sheet** with: date, amount, mode, type, reference number, receipt number (if provided). Receipt PDF is optional Phase 3 (documents), only if the client supplies receipts.

### 8.9 S9: Profile
**Data:** `GET /v1/me`.
- Avatar (initials fallback; photo if `photoUrl`), full name, mobile number (full, here only), city/area if provided.
- **About the lender:** `<NBFC_LEGAL_NAME>`, RBI registration number, registered address (from `/config`).
- Links: Settings, Help and Support, Privacy Policy, Terms and Conditions, App version.
- Log out button (confirm dialog). Calls `POST /v1/auth/logout`, clears SecureStore and in-memory state.

### 8.10 S10: Settings
- App lock toggle (enable/disable requires successful biometric check).
- Notifications toggle (Phase 2).
- Language selector (Phase 2: English / हिन्दी).
- **Delete my account** (red). Flow: explanation screen (what is removed vs. what the company must retain by law), confirm with OTP re-verification or biometric, then `DELETE /v1/me`. On success, log out and show confirmation: "Your request has been received. Your app access is removed. Loan records are retained as required by law."
- Log out.

### 8.11 S11: Help and Support
From `/config.support`: Call (`tel:`), WhatsApp (`https://wa.me/`), Email (`mailto:`), working hours, branch address. **Grievance redressal officer** name, phone and email (regulatory requirement). FAQ (static, 5 to 8 entries; client supplies text): "Why is my outstanding different from what I paid?", "How is late fee calculated?", "How do I pay my EMI?", etc. The payment answer MUST be **static text supplied by the client** (e.g. visit your branch or contact your collection agent). No payment links, QR codes, UPI IDs or bank details in the app.

### 8.12 S12: Legal
Privacy Policy and Terms open from `/config` URLs in an in-app browser (`expo-web-browser`).

### 8.13 S14: Update Required and S15: Maintenance
Full-screen blocking screens. Update Required shows a button to the store listing (URL from `/config.storeUrl`). Maintenance shows a message from `/config.maintenanceMessage` and a Retry button.

### 8.14 Screen acceptance criteria (summary)
- Every screen renders loading, empty, error and success states.
- No raw JSON, stack trace, or internal error code appears in the UI. Show friendly messages.
- All text comes from i18n keys (no hardcoded strings in components).
- Screens render correctly at 360 x 640 dp and at 200% font scale.

---

## 9. Phase 2 specification (summary)

### 9.1 Push notifications
- Register device token after login: `POST /v1/devices` `{ expoPushToken, platform, appVersion }`. Remove on logout: `DELETE /v1/devices/{deviceId}`.
- Backend scheduler (cron, IST) sends: **EMI due today** (9:00 AM), **EMI overdue** (daily at 10:00 AM while overdue, max once per day), **Payment recorded** (informational only: sent when a new payment row appears in the client DB, polled every few minutes; the app never takes payments).
- Notification payload contains **no amounts or account numbers** on the lock screen (generic text, e.g. "You have an EMI due today. Open the app for details."). Deep link opens the relevant loan.
- Users can disable notifications in Settings.

### 9.2 Payments (removed)
Payments are out of scope in every phase (Sections 1.5 and 2.2). Do not add a "Pay now" button, payment link, UPI intent, QR code, or gateway. This section number is kept so other references stay stable.

### 9.3 Hindi localisation
- `hi.json` complete for all keys. Language selector in Settings. Default follows device locale, falling back to English.

### 9.4 Encrypted offline cache
- Cache last-loaded loan summary and detail in encrypted storage (key stored in SecureStore), expiring after 24 hours, cleared on logout. Show "Showing saved data from {time}" banner when offline.

### 9.5 Phase 3 outline (optional documents only)
Statement PDF generation and NOC download, only if the client asks for them and supplies the approved document formats. Payment gateways, payment receipts for payments made through the app, and any money movement are **never** in scope.

---

## 10. Data model and API contract

### 10.1 Conventions (MUST)
| Topic | Rule |
|---|---|
| Base path | `/v1` |
| Format | JSON, UTF-8 |
| **Money** | **Integer paise** (₹1 = 100). Field names end with `Paise`. Example: ₹1,200 = `120000`. DB decimals are converted at the repository boundary using integer arithmetic (round half up). |
| Dates | `YYYY-MM-DD` strings (IST calendar dates). |
| Timestamps | ISO 8601 with offset, e.g. `2026-09-19T10:30:00+05:30`. |
| IDs | Opaque strings. `loanId` is an internal ID. `accountNumber` is the human-readable number (e.g. `A00001`). Do not expose sequential internal IDs if they are guessable. Use a stable opaque public ID (HMAC-derived or stored mapping). |
| Auth | `Authorization: Bearer <accessToken>` on all endpoints except `/auth/*`, `/config`, `/health`. |
| Request ID | Client sends `X-Request-Id` (UUID). API echoes it and logs it. |
| App version | Client sends `X-App-Version` and `X-Platform` (`ios` or `android`) on every request. |
| Unknown fields | Ignored by clients. Additive changes are non-breaking. |

### 10.2 Error format
```json
{
  "error": {
    "code": "AUTH_INVALID_OTP",
    "message": "Incorrect OTP.",
    "details": { "attemptsLeft": 2 },
    "requestId": "b6f1c9a0-..."
  }
}
```
| HTTP | `code` examples |
|---|---|
| 400 | `VALIDATION_ERROR`, `AUTH_INVALID_OTP`, `AUTH_OTP_EXPIRED` |
| 401 | `AUTH_UNAUTHORIZED`, `AUTH_REFRESH_INVALID` |
| 403 | `AUTH_OTP_ATTEMPTS_EXCEEDED` |
| 404 | `NOT_FOUND` (also returned when a loan belongs to another customer, never 403, to avoid leaking existence) |
| 426 | `UPDATE_REQUIRED` |
| 429 | `AUTH_RATE_LIMITED` (header `Retry-After`) |
| 500 | `INTERNAL` |
| 503 | `MAINTENANCE`, `UPSTREAM_DB_UNAVAILABLE` |

User-facing messages are mapped client-side from `code` via i18n. Never display `message` verbatim from the server unless it is a known safe code.

### 10.3 Types (TypeScript, in `shared/src/types`)
```ts
export type Paise = number;      // integer
export type IsoDate = string;    // YYYY-MM-DD
export type IsoDateTime = string;

export type LoanStatus = 'ACTIVE' | 'OVERDUE' | 'CLOSED';
export type PayFrequency = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
export type InstallmentStatus = 'PAID' | 'PARTIAL' | 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
export type TxnType = 'PAYMENT' | 'CHARGE' | 'DISCOUNT' | 'ADJUSTMENT';
export type TxnMode = 'ONLINE' | 'CASH' | 'OTHER';

export interface Me {
  customerId: string;
  fullName: string;
  mobile: string;            // "+919876543210" (full; only in /me)
  email?: string;
  city?: string;
  photoUrl?: string;
}

export interface NextDue { date: IsoDate; amountPaise: Paise; isToday: boolean }
export interface LastPayment { date: IsoDate; amountPaise: Paise }

export interface LoanSummary {
  loanId: string;
  accountNumber: string;         // "A00001"
  productName: string;           // "Regular"
  status: LoanStatus;
  loanDate: IsoDate;
  principalPaise: Paise;
  emiAmountPaise: Paise;
  payFrequency: PayFrequency;
  totalInstallments: number;
  installmentsPaid: number;      // fully paid only
  installmentsRemaining: number; // total - installmentsPaid
  outstandingPaise: Paise;       // equals financials.outstandingPaise
  overdueInstallmentsPaise: Paise;
  overdueInstallmentsCount: number;
  nextDue: NextDue | null;       // null if closed or nothing left
  lastPayment: LastPayment | null;
  maturityDate: IsoDate | null;
}

export interface LoanFinancials {
  principalPaise: Paise;
  totalInterestPaise: Paise;
  payablePaise: Paise;           // principal + interest (e.g. 1,20,000)
  lateFeePaise: Paise;
  overdueInterestPaise: Paise;
  recoveryChargesPaise: Paise;
  discountPaise: Paise;
  adjustedPaise: Paise;          // "Payment Adjusted"
  totalDuePaise: Paise;          // payable + charges - discount
  totalPaidPaise: Paise;         // installments paid / credited
  outstandingPaise: Paise;       // totalDue - adjusted - totalPaid
}

export interface LoanDetail extends LoanSummary {
  asOf: IsoDateTime;
  firstInstallmentDate: IsoDate;
  branchName: string | null;
  financials: LoanFinancials;
  paymentBreakup: { onlinePaidPaise: Paise; cashPaidPaise: Paise };
  keyFacts?: { aprPercent?: number; kfsDocumentUrl?: string }; // optional; copied from client data, never computed by us
}

export interface Installment {
  number: number;                // 1-based
  dueDate: IsoDate;
  amountPaise: Paise;
  paidPaise: Paise;
  status: InstallmentStatus;
  isOverdue: boolean;            // true for PARTIAL with dueDate < today as well
  paidOn?: IsoDate;
}

export interface ScheduleResponse {
  asOf: IsoDateTime;
  summary: { total: number; paid: number; partial: number; overdue: number; dueToday: number; upcoming: number };
  items: Installment[];
}

export interface Transaction {
  id: string;
  date: IsoDate;
  amountPaise: Paise;            // always positive; direction implied by type
  type: TxnType;
  mode: TxnMode;
  referenceNo?: string;
  receiptNo?: string;
}

export interface AppConfig {
  minSupportedVersion: { android: string; ios: string };
  updateRequired: boolean;       // computed server-side from X-App-Version
  storeUrl: { android: string; ios: string };
  maintenance: boolean;
  maintenanceMessage?: string;
  lender: { legalName: string; rbiRegistrationNo: string; registeredAddress: string };
  support: { phone: string; whatsapp?: string; email: string; hours: string };
  grievanceOfficer: { name: string; phone: string; email: string };
  legal: { privacyPolicyUrl: string; termsUrl: string };
  features: { pushNotifications: boolean; screenSecurity: boolean };
}
```

### 10.4 Endpoints

#### `GET /v1/health` (public)
`200 { "status": "ok", "time": "..." }`. Includes DB connectivity check on `/v1/health/ready`.

#### `GET /v1/config` (public)
Returns `AppConfig`. Uses `X-App-Version` and `X-Platform` to compute `updateRequired`.

#### `POST /v1/auth/otp/request` (public, rate-limited)
```json
// request
{ "mobile": "9876543210" }
// 200 (ALWAYS returned for valid-format numbers, whether registered or not)
{ "otpRequestId": "otp_8f2c...", "expiresInSec": 300, "resendAfterSec": 30 }
```
Server behaviour: normalise to `+91XXXXXXXXXX`. Look up exactly one customer. If found, create OTP and send via SMS. If not found, create no OTP but return the same shape after a similar delay (to prevent enumeration).

#### `POST /v1/auth/otp/verify` (public, rate-limited)
```json
// request
{ "otpRequestId": "otp_8f2c...", "otp": "123456",
  "device": { "platform": "android", "model": "Redmi Note 11", "appVersion": "1.0.0" } }
// 200
{ "accessToken": "<jwt>", "accessTokenExpiresInSec": 900,
  "refreshToken": "<opaque>", "refreshTokenExpiresInSec": 2592000,
  "me": { /* Me */ } }
```
Errors: `AUTH_INVALID_OTP` (with `attemptsLeft`), `AUTH_OTP_EXPIRED`, `AUTH_OTP_ATTEMPTS_EXCEEDED`.

#### `POST /v1/auth/refresh` (public)
```json
{ "refreshToken": "<opaque>" }   // 200: new { accessToken, refreshToken, ... }
```
Refresh tokens **rotate** on every use. Re-use of an already-rotated token revokes the whole session family (theft detection) and returns `AUTH_REFRESH_INVALID`.

#### `POST /v1/auth/logout` (auth)
Revokes the current session and refresh token. `204`.

#### `GET /v1/me` (auth) returns `Me`.

#### `DELETE /v1/me` (auth)
Creates an account-deletion request in the app-owned schema, revokes all sessions, deletes device tokens, and writes an audit record. Does **not** delete loan data from the client DB (regulatory retention). `202 { "requestId": "...", "status": "RECEIVED" }`.

#### `GET /v1/loans` (auth)
```json
{
  "asOf": "2026-09-19T10:30:00+05:30",
  "totals": { "outstandingPaise": 9416700, "overdueInstallmentsPaise": 7500000 },
  "loans": [
    {
      "loanId": "ln_7Qx...",
      "accountNumber": "A00001",
      "productName": "Regular",
      "status": "OVERDUE",
      "loanDate": "2026-06-15",
      "principalPaise": 10000000,
      "emiAmountPaise": 120000,
      "payFrequency": "DAILY",
      "totalInstallments": 100,
      "installmentsPaid": 32,
      "installmentsRemaining": 68,
      "outstandingPaise": 9416700,
      "overdueInstallmentsPaise": 7500000,
      "overdueInstallmentsCount": 63,
      "nextDue": { "date": "2026-09-19", "amountPaise": 120000, "isToday": true },
      "lastPayment": { "date": "2026-09-11", "amountPaise": 500000 },
      "maturityDate": "2026-09-23"
    }
  ]
}
```
`totals` cover ACTIVE and OVERDUE loans only.

#### `GET /v1/loans/{loanId}` (auth) returns `LoanDetail`
```json
{
  "...LoanSummary fields": "...",
  "asOf": "2026-09-19T10:30:00+05:30",
  "firstInstallmentDate": "2026-06-16",
  "branchName": "Sample Branch",
  "financials": {
    "principalPaise": 10000000, "totalInterestPaise": 2000000, "payablePaise": 12000000,
    "lateFeePaise": 0, "overdueInterestPaise": 1316700, "recoveryChargesPaise": 0,
    "discountPaise": 0, "adjustedPaise": 0,
    "totalDuePaise": 13316700, "totalPaidPaise": 3900000, "outstandingPaise": 9416700
  },
  "paymentBreakup": { "onlinePaidPaise": 3900000, "cashPaidPaise": 0 }
}
```
Invariant (MUST hold and be unit-tested): `outstanding = payable + lateFee + overdueInterest + recoveryCharges - discount - adjusted - totalPaid`.

#### `GET /v1/loans/{loanId}/schedule` (auth) returns `ScheduleResponse`
All installments in one response (expected at most about 600 rows). Supports optional `?status=PAID|PENDING|OVERDUE` filter (server-side filter optional; mobile may filter locally).

#### `GET /v1/loans/{loanId}/transactions?cursor=&limit=` (auth)
```json
{ "items": [ /* Transaction[] newest first */ ], "nextCursor": "eyJ..." }
```
`limit` default 20, max 100. `nextCursor` is `null` at the end. Cursor is opaque (encode `(date, id)`).

#### `POST /v1/devices` and `DELETE /v1/devices/{deviceId}` (auth, Phase 2)
```json
{ "expoPushToken": "ExponentPushToken[...]", "platform": "android", "appVersion": "1.1.0" }
```

### 10.5 Fields that MUST NEVER appear in any response
See **Appendix B**. Enforced by DTO mappers and a contract test that scans responses for blacklisted keys.

---

## 11. Authentication and session design

### 11.1 OTP
- 6 digits, cryptographically random. Stored as **HMAC-SHA256(otp, OTP_HMAC_SECRET + otpRequestId)**, never plaintext.
- Expiry 5 minutes. Max 3 verify attempts per OTP. Resend allowed after 30 s. Max 5 OTP requests per mobile per hour and 20 per IP per hour. Constant-time comparison.
- After success the OTP is invalidated.
- **Dev/mock mode only** (`NODE_ENV!=production` and `OTP_DEV_MODE=true`): fixed OTP `123456`. The server MUST refuse to start in production with `OTP_DEV_MODE=true`.
- OTP text MUST follow the client's DLT-approved template. The OTP value is never logged.

### 11.2 Tokens
- **Access token:** JWT (HS256 with a secret of at least 32 bytes, or RS256), 15 min TTL, claims: `sub` (customerId), `sid` (session ID), `iat`, `exp`. No PII in claims.
- **Refresh token:** 256-bit random opaque string, stored hashed (SHA-256) in `mobile_app.sessions`, 30-day TTL, **rotating**, bound to device record.
- Mobile stores the refresh token in SecureStore only, and the access token in memory only.
- API client behaviour: on `401 AUTH_UNAUTHORIZED`, attempt **one** refresh (single-flight, so concurrent requests wait on the same refresh), retry the original request once, otherwise logout.

### 11.3 Authorisation
- Every authenticated route resolves `customerId` from the JWT. Repositories require `customerId` as a mandatory first argument.
- Accessing another customer's `loanId` returns `404`.
- Integration test (MUST exist): customer A requests customer B's loan, schedule and transactions and receives `404` for each.

### 11.4 Audit log (app-owned schema)
Record: OTP requested/verified/failed (mobile hash, not plaintext), login, logout, refresh reuse detected, account deletion requested. Fields: timestamp, event, customerId (if known), IP, device, requestId. No OTPs, tokens or financial values.

---

## 12. Repayment schedule logic

### 12.1 Principle
**Use the client's data when it exists.** If the DB has an installment table, `DbScheduleProvider` maps it. Otherwise `ComputedScheduleProvider` generates it. Both implement:
```ts
interface ScheduleProvider {
  getSchedule(input: { customerId: string; loan: LoanRecord; asOfDate: IsoDate }): Promise<Installment[]>;
}
```
Charges (late fee, overdue interest, recovery) are **always** read from the DB, never calculated here (Q7).

### 12.2 Inputs for computed schedule
`firstInstallmentDate`, `payFrequency`, `totalInstallments`, `emiAmountPaise`, optional `finalInstallmentAmountPaise`, optional `weeklyOffWeekday` (0 to 6, Sunday = 0), `totalInstallmentPaidPaise` (the DB's "Installment paid"/credited total), `asOfDate` (today in IST).

### 12.3 Algorithm (pure functions in `shared/src/schedule.ts`)
1. **Due dates:** installment 1 is on `firstInstallmentDate`. Next dates:
   - `DAILY`: +1 day. If the result is the loan's weekly-off weekday, skip to the next day.
   - `WEEKLY`: +7 days. `FORTNIGHTLY`: +14 days.
   - `MONTHLY`: same day-of-month as the **first** installment, clamped to month-end (e.g. 31 Jan → 28/29 Feb → 31 Mar).
2. **Amounts:** each installment is `emiAmountPaise`, except the last may use `finalInstallmentAmountPaise` if provided.
3. **Allocation (FIFO):** distribute `totalInstallmentPaidPaise` to installments in order. Each gets `min(amount, remaining)`.
4. **Status** per installment, with `today = asOfDate`:
   - `paidPaise >= amountPaise` → `PAID`
   - `0 < paidPaise < amountPaise` → `PARTIAL` (`isOverdue = dueDate < today`)
   - else `dueDate < today` → `OVERDUE`; `dueDate == today` → `DUE_TODAY`; else `UPCOMING`
5. **Derived summary:**
   - `installmentsPaid` = count of `PAID`; `installmentsRemaining` = total − paid.
   - `overdueInstallmentsPaise` = Σ(`amount − paid`) for installments with `dueDate < today`; `overdueInstallmentsCount` = how many of those have a remainder.
   - `nextDue` = earliest installment with remainder > 0 and `dueDate >= today`; `isToday` if equal to today. `amountPaise` is the remainder for that installment. `null` if none.
   - `maturityDate` = DB maturity date if set, else last installment's `dueDate`.
   - Loan `status`: `CLOSED` if outstanding is 0 (or DB says closed); `OVERDUE` if `overdueInstallmentsPaise > 0`; else `ACTIVE`.
6. All arithmetic in integer paise. All date math in IST calendar dates (no time-of-day, no UTC off-by-one).

### 12.4 Golden test (MUST pass; derived from the real web app sample, using fake identity)
**Input:** `firstInstallmentDate=2026-06-16`, `DAILY`, `totalInstallments=100`, `emi=120000`, no weekly off, `totalInstallmentPaidPaise=3900000`, `asOfDate=2026-09-19`.

**Expected:**
- Installment #1 due `2026-06-16`; installment #100 due `2026-09-23` (= maturity date).
- Installments #1 to #32 `PAID`. Installment #33 (due `2026-07-18`) `PARTIAL` with `paidPaise=60000`, `isOverdue=true`.
- `installmentsPaid = 32`, `installmentsRemaining = 68`.
- Installments #34 to #95 `OVERDUE` (#95 due `2026-09-18`). #96 (due `2026-09-19`) `DUE_TODAY`. #97 to #100 `UPCOMING`.
- `overdueInstallmentsPaise = 95 * 120000 - 3900000 = 7500000` (₹75,000). `overdueInstallmentsCount = 63`.
- `nextDue = { date: "2026-09-19", amountPaise: 120000, isToday: true }`.

Additional unit tests: monthly month-end clamping, weekly, fortnightly, weekly-off skipping, zero payments, fully paid, overpayment (extra ignored in schedule), final installment override, leap year.

---

## 13. General API behaviours
- All list endpoints return deterministic ordering (schedule by `number`, transactions by `date desc, id desc`).
- Responses SHOULD set `Cache-Control: no-store` on all authenticated routes.
- Gzip/brotli compression enabled. Request body limit 10 KB. Request timeout 10 s. DB query timeout 5 s.
- CORS is not required for the mobile app. Disable it by default.

---

## 14. Database access layer

### 14.1 Principles
- The API uses **two** database connections:
  1. **Client DB (read-only):** MySQL user with `SELECT` only, on the specific tables or views the app needs. No `INSERT/UPDATE/DELETE`, no DDL, no access to unrelated tables.
  2. **App DB (read/write):** the separate `mobile_app` schema for OTP, sessions, devices, deletion requests and audit.
- **Strongly recommended:** the client's DBA creates **database views** (e.g. `v_app_customer`, `v_app_loan`, `v_app_installment`, `v_app_transaction`) exposing only customer-safe columns. This insulates the app from schema changes in the web app and limits exposure if credentials leak. If views are not possible, map tables directly in the repository.
- Use parameterised queries only. No string-concatenated SQL.
- Connection pool: max 10, idle timeout 30 s, retry once on transient errors, map failures to `UPSTREAM_DB_UNAVAILABLE`.

### 14.2 Repository interface (implement `MysqlLoanRepository` and `MockLoanRepository`)
```ts
interface LoanRepository {
  findCustomersByMobile(mobileE164: string): Promise<CustomerRecord[]>; // used by auth, expects exactly 1
  getCustomer(customerId: string): Promise<CustomerRecord | null>;

  listLoans(customerId: string): Promise<LoanRecord[]>;
  getLoan(customerId: string, loanId: string): Promise<LoanRecord | null>;       // MUST filter by customer

  getLoanCharges(customerId: string, loanId: string): Promise<LoanChargesRecord>; // late fee, overdue interest, ...
  listInstallments?(customerId: string, loanId: string): Promise<InstallmentRecord[]>; // only if table exists
  listTransactions(customerId: string, loanId: string, page: { cursor?: string; limit: number }): Promise<Page<TransactionRecord>>;
  sumPayments(customerId: string, loanId: string): Promise<{ onlinePaise: number; cashPaise: number; totalPaise: number }>;
}
```
Mapping rules:
- Raw records are internal types (`*Record`). Public DTOs are produced only by `toLoanSummaryDto`, `toLoanDetailDto`, `toInstallmentDto`, `toTransactionDto`, `toMeDto` (whitelist mappers).
- Normalise mobile numbers when matching (strip spaces, `+91`, leading `0`, compare last 10 digits). Add a TODO to confirm the stored format.

### 14.3 DB mapping table (HUMAN to fill in; stored in `docs/DB_MAPPING.md`)
Agents: generate the template file, leave values as `TBD`, and do not guess.

| Needed data | Table.column | Notes |
|---|---|---|
| Customer id | TBD | |
| Customer full name | TBD | |
| Customer primary mobile | TBD | format? (+91, spaces?) |
| Customer city/area | TBD | optional |
| Loan id (internal) | TBD | |
| Loan account number (e.g. A04391) | TBD | |
| Scheme/product name | TBD | |
| Loan date | TBD | |
| First installment (interest) date | TBD | |
| Principal | TBD | |
| Total interest | TBD | |
| Payable amount | TBD | |
| EMI amount | TBD | |
| Pay frequency | TBD | map to enum |
| Total installments (tenure) | TBD | |
| Weekly off | TBD | optional |
| Maturity date | TBD | may be unset |
| Branch name | TBD | |
| Internal loan status | TBD | map to ACTIVE/OVERDUE/CLOSED |
| Late fee | TBD | |
| Overdue interest charge | TBD | |
| Recovery visit charges | TBD | |
| Discount / offer | TBD | |
| Payment adjusted | TBD | |
| Installments paid / credited total | TBD | |
| Transactions (date, amount, mode, ref, receipt) | TBD | |
| Installment schedule table (if any) | TBD | Q3 |

### 14.4 App-owned schema (Knex migrations)
```
mobile_app.otp_requests      (id, mobile_hash, customer_id NULL, otp_hmac, attempts, expires_at, consumed_at, created_at, ip)
mobile_app.sessions          (id, customer_id, refresh_hash, family_id, device_id, expires_at, rotated_at, revoked_at, created_at)
mobile_app.devices           (id, customer_id, platform, model, app_version, push_token NULL, created_at, last_seen_at)
mobile_app.deletion_requests (id, customer_id, status, requested_at, handled_at, handled_by)
mobile_app.audit_log         (id, ts, event, customer_id NULL, ip, device_id NULL, request_id, meta_json)
```
Indexes: `otp_requests(mobile_hash, created_at)`, `sessions(refresh_hash)`, `sessions(customer_id)`, `devices(customer_id)`. Purge expired OTPs after 24 h and expired sessions after 60 days via a scheduled job.

---

## 15. Security requirements (MUST unless noted)

### 15.1 Backend
- S1. HTTPS only. Redirect HTTP to HTTPS. HSTS enabled.
- S2. Secrets only from environment or a secrets manager. Never in code or logs. Fail fast on missing env (zod-validated).
- S3. Every query scoped by `customerId` (A3). Contract tests prove no cross-customer access.
- S4. Rate limits: auth endpoints (Section 11.1), plus a global 120 requests/min per IP and 60/min per customer on data endpoints.
- S5. Input validation on every request via zod. Reject unknown fields on auth endpoints.
- S6. Security headers (`@fastify/helmet`). Disable `X-Powered-By`.
- S7. Dependency audit in CI (`npm audit --omit=dev`, fail on high or critical). Pin Node LTS in Docker.
- S8. Logs contain request ID, route, status, latency, `customerId` (opaque). No mobile numbers, OTPs, tokens, names, or amounts.
- S9. The DB users have least privilege. Document the exact `GRANT` statements in `docs/DB_ACCESS.md`.
- S10. Server refuses to boot in production if `OTP_DEV_MODE=true`, if secrets are shorter than 32 bytes, or if the client DB user has write privileges (check `SHOW GRANTS` at startup and warn or fail, configurable).

### 15.2 Mobile
- M1. Tokens in SecureStore only. Access token in memory only.
- M2. No secrets in the bundle. `EXPO_PUBLIC_*` values are public by definition.
- M3. HTTPS only. No cleartext traffic (Android `usesCleartextTraffic=false`, iOS ATS default).
- M4. No financial or personal data in logs, Sentry events, analytics, or the clipboard. Disable screenshots-in-app-switcher preview where possible (blur/privacy overlay when app is backgrounded).
- M5. `Sentry.beforeSend` strips request bodies, headers and user identifiers.
- M6. On logout or deletion, clear SecureStore, in-memory caches, and TanStack Query cache.
- M7 (SHOULD). Certificate pinning (Phase 2, requires a rotation plan). Root/jailbreak detection as a soft warning only.
- M8. Request only the permissions needed: **Internet; Notifications (Phase 2); Biometrics**. No contacts, SMS, location, storage, camera, microphone, call logs or installed-apps permissions.

---

## 16. Compliance and store requirements

> Engineering-relevant expectations only. The client's compliance team MUST review the app against the **current** RBI Digital Lending Directions and the **current** Google Play and Apple policies before submission. Policies change, so verify rather than rely on this list.

### 16.1 Regulatory / disclosure (in-app)
- C1. Show the lender's legal name and RBI registration number in Profile (About the lender) and on the Login screen footer.
- C2. Show the Grievance Redressal Officer's contact details in Help.
- C3. Show every charge as its own line item (late fee, overdue interest, recovery charges, discount) on the Loan Overview.
- C4. Privacy Policy and Terms links on Login, Profile and store listings. The policy covers what data the app accesses (minimal), the purpose, retention, and how to request deletion.
- C5. Data stays within India: API and app-owned DB hosted in an Indian region (confirm with client compliance).
- C6. Data minimisation: the app collects **no** device contacts, media, SMS, call logs or location.
- C7. Account deletion request available in-app (Section 8.10, S10), with a clear statement of data the company must retain by law.
- C8. The footer disclaimer "This app shows your loan information only. Payments are not made in this app." is visible on the Loan Overview and in the store description.
- C9. No loan offers, marketing, ads, third-party lender content, payment links, QR codes, UPI IDs or bank details anywhere in the app.
- C10. If the client has an APR / Key Fact Statement per loan, show it (optional `keyFacts` block). If not, do not invent or compute one.

### 16.2 Google Play
- Developer account owned by the **NBFC**. The developer account name MUST match the NBFC's registered business name. Set the app category to **Finance**. Name the NBFC and its RBI registration number in the store description.
- Complete the **Financial features declaration** (required for any app with financial features) accurately: the app offers no loans, takes no applications, disburses nothing, and accepts no payments. It is a read-only account viewer for existing customers.
- Google's India personal-loan rules (Personal Loan App declaration; app must be on RBI's list of digital lending apps) are written around apps that offer loans. Whether Google treats a servicing-only tracker as a personal loan app is **[OPEN: Q18]**. Ask Play support before the first submission and record the answer. If Google does treat it as one, Section 16.5 applies before the app can be submitted for review.
- Complete the **Data safety** form accurately (data collected: phone number, name, financial info; encrypted in transit; deletion available).
- **Account type:** organisation accounts are exempt from the closed-test requirement but need a D-U-N-S number (can take up to 30 days). A personal account created after 13 Nov 2023 must run a closed test with at least 12 testers opted in for 14 continuous days before applying for production access. The NBFC SHOULD use an organisation account.
- Target the required Android API level at submission time. Provide privacy policy URL, icon 512x512, feature graphic, screenshots.

### 16.3 Apple App Store
- Apple Developer account (Organisation) owned by the **NBFC**. Apple expects financial-services apps to be submitted by the institution performing the service, which this setup satisfies.
- Apple's personal-loan rules (clear disclosure of all loan terms including APR and due date, a 36% APR cap including fees, no requirement to repay in full within 60 days) are written for apps that **offer** personal loans. This tracker does not, but a reviewer may still ask. Do **not** claim the app is exempt. State facts in the review notes (Appendix F), answer questions, and use the appeal process if needed.
- Real-world rejection causes to pre-empt: reviewer cannot log in (demo account), cannot find account deletion (give the exact path in review notes), reviewer asks for proof of licence (put RBI registration details in review notes).
- App Privacy "nutrition labels" accurate.
- In-app account deletion initiation required (satisfied by S10).
- Provide a **demo account** for reviewers: a fixed test mobile number with fixed OTP on the **staging/review backend**. Document in review notes. This MUST be an isolated review environment with fake data and never enabled in production for real customers.
- If third-party sign-in is ever added, "Sign in with Apple" rules apply (not applicable now).
- Provide privacy policy URL, support URL, screenshots (required device sizes), description, keywords, age rating.

### 16.4 Store assets checklist (Phase 1 deliverable)
App name, short and long description, icon (1024x1024 no transparency for iOS), screenshots (phone sizes for both stores), privacy policy URL, support URL/email, category (Finance), content rating, release notes. Description MUST state that the app is for existing customers of the NBFC, names the NBFC, and says it does not offer loans or accept payments. Use the templates in Appendix F.

### 16.5 Regulatory classification and RBI reporting [OPEN: Q16]
RBI's Digital Lending Directions, 2025 define digital lending broadly (it includes recovery and associated customer service) and define a digital lending app as any mobile or web app with a user interface that facilitates such services, standalone or as part of a larger platform. A tracker showing a customer's dues could plausibly fall within that definition. Regulated entities report their digital lending apps on RBI's CIMS portal, which feeds the public DLA directory.
- **Decision owner:** the client's compliance team, in writing. Neither engineers nor coding agents decide this.
- **Recommended default:** report the app on CIMS anyway. It lets customers verify the app and removes a possible Google Play blocker.
- **Gate:** store submission (R-05) MUST NOT happen until R-06 is complete.
- **Engineering impact:** none beyond showing the lender legal name and RBI registration number (C1) and a configurable store listing text.

---

## 17. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance (mobile) | Cold start to interactive < 3 s on a mid-range Android device. List scrolling at 60 fps on schedules with 100 to 600 rows. |
| Performance (API) | p95 < 500 ms for loan endpoints under normal load. DB queries indexed on `customer_id`, `loan_id`. |
| Availability | API target 99.5% monthly. Graceful `503 MAINTENANCE` handling in app. |
| Capacity | Design for 10,000 registered customers and 500 concurrent users. Stateless API, horizontally scalable. |
| Compatibility | Minimum OS versions are those supported by the chosen Expo SDK (do not raise further without approval). Portrait only. Phones only. |
| Accessibility | WCAG AA contrast, screen-reader labels, dynamic type to 200%. |
| Localisation | i18n from day one. English in Phase 1, Hindi in Phase 2. Indian number grouping. Dates in `d MMM yyyy`. |
| Observability | Sentry (mobile and API), structured logs, uptime ping on `/v1/health/ready`, alerts on 5xx rate and login failure spikes. |
| App size | Keep Android AAB download size reasonable (target < 40 MB). No unused heavy libraries. |
| Data freshness | Reads are live from the client DB. `asOf` reflects server read time. |

---

## 18. Testing strategy

### 18.1 Shared and API
- **Unit:** schedule calculator (Section 12.4 golden test and extras), money helpers (`formatINR(13316700) === "₹1,33,167"`; `formatINR(9416700)` gives `₹94,167`), date helpers (IST boundaries, month-end clamping), DTO mappers, OTP hashing.
- **Integration (docker-compose MySQL with fixture seed):** auth flow end to end, refresh rotation and reuse detection, rate limiting, OTP expiry and attempts, `/loans`, `/loans/:id`, `/schedule`, `/transactions` paging.
- **Security tests (MUST):** cross-customer access returns 404; blacklisted fields never present (scan response JSON keys against Appendix B); invalid/expired/tampered JWT rejected; SQL injection payloads in params are harmless; production boot guards.
- **Invariant tests:** `outstanding` formula (Section 10.4); `installmentsPaid + installmentsRemaining == totalInstallments`.
- **Contract test:** responses validate against `openapi.yaml`.

### 18.2 Mobile
- **Unit and component:** formatters, API client (refresh single-flight, retry once, error normalisation), screens in all four states (loading, empty, error, success) using mock adapter.
- **E2E (Maestro):** login with dev OTP, view home, open loan, view schedule (scroll to next due), view history (paging), logout, delete-account flow (mock), app lock enable and unlock (where emulator supports).
- **Manual QA matrix:** Android (low, mid and high devices, Android versions across supported range), iPhone (small and large screens), slow 3G, airplane mode, 200% font scale, dark mode, screen reader.
- **Data parity QA:** pick 10 real loans on staging, compare every number in the app with the web app. Zero mismatches allowed before release.

---

## 19. DevOps, environments, configuration

### 19.1 Environments
| Env | Mobile mode | API | DB |
|---|---|---|---|
| Local dev | `mock` (no server needed) or `live` to local API | local Fastify | docker MySQL with fake seed |
| Staging / review | `live` | staging API | anonymised copy of client DB (or fake data) |
| Production | `live` | production API | client's production DB (read-only user) |

### 19.2 Mobile configuration (`.env`, `EXPO_PUBLIC_*`)
```
EXPO_PUBLIC_API_MODE=mock|live
EXPO_PUBLIC_API_BASE_URL=https://api.example.com/v1
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_ENV=development|staging|production
```
`eas.json` profiles: `development` (dev client, mock), `preview` (internal distribution, staging), `production` (store, auto-increment build number).

### 19.3 API environment variables (validated at boot)
```
NODE_ENV, PORT, LOG_LEVEL
CLIENT_DB_HOST, CLIENT_DB_PORT, CLIENT_DB_USER, CLIENT_DB_PASSWORD, CLIENT_DB_NAME
APP_DB_HOST, APP_DB_PORT, APP_DB_USER, APP_DB_PASSWORD, APP_DB_NAME
JWT_ACCESS_SECRET, JWT_ACCESS_TTL_SEC=900
REFRESH_TTL_DAYS=30
OTP_HMAC_SECRET, OTP_TTL_SEC=300, OTP_MAX_ATTEMPTS=3, OTP_DEV_MODE=false
SMS_PROVIDER=msg91|console, MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, MSG91_SENDER_ID
MIN_APP_VERSION_ANDROID, MIN_APP_VERSION_IOS, STORE_URL_ANDROID, STORE_URL_IOS
MAINTENANCE_MODE=false, MAINTENANCE_MESSAGE
EXPO_ACCESS_TOKEN (Phase 2)
SUPPORT_PHONE, SUPPORT_WHATSAPP, SUPPORT_EMAIL, SUPPORT_HOURS
GRIEVANCE_NAME, GRIEVANCE_PHONE, GRIEVANCE_EMAIL
LENDER_LEGAL_NAME, LENDER_RBI_REG_NO, LENDER_ADDRESS
PRIVACY_POLICY_URL, TERMS_URL
SENTRY_DSN
```
Provide `.env.example` files with every key and no real values.

### 19.4 CI (GitHub Actions)
On every PR: install, lint, typecheck, unit tests (shared, api, mobile), API integration tests (docker MySQL), `npm audit`, OpenAPI validation. On version tag: build API Docker image; trigger EAS Build (preview or production).

### 19.5 Deployment
- API: Docker image deployed to the chosen host (Section 6.3). Health checks on `/v1/health/ready`. Zero-downtime restart. Automated backups of the app-owned schema.
- Mobile: EAS Build then EAS Submit to Play Console (internal testing track first) and App Store Connect (TestFlight first). Staged rollout (e.g. 10% then 50% then 100%) on Play.
- OTA updates (`expo-updates`) MAY be used for JS-only fixes. Never use OTA to change app behaviour in ways that conflict with store review.

---

## 20. Task breakdown with acceptance criteria

IDs are stable references for commits and PRs.

### Phase 0: Foundation
| ID | Task | Acceptance criteria |
|---|---|---|
| F-01 | Repo scaffold: npm workspaces (`shared`, `apps/mobile`, `apps/api`), TS strict, ESLint, Prettier, Husky pre-commit, GitHub Actions CI | `npm run lint && npm run typecheck && npm test` pass in CI on an empty skeleton |
| F-02 | Expo app bootstrap with Expo Router, theme tokens, i18n (`en.json`), env handling, Sentry stub | App launches on Android and iOS simulators and shows a themed placeholder; no hardcoded colours/strings in components |
| F-03 | Write `contracts/openapi.yaml` from Section 10, generate TS types into `shared` | Types compile; spec validates; CI fails on drift between spec and generated types |
| F-04 | `shared`: `money.ts`, `dates.ts` (IST), `schedule.ts` | Golden test (12.4) and all extra tests in 12.4 pass; 100% branch coverage on `schedule.ts` |
| F-05 | Mobile API layer: `ApiClient` interface, **live adapter** (fetch, headers, error normalisation, single-flight refresh) and **mock adapter** (fixtures, simulated latency, error toggles) | Switching `EXPO_PUBLIC_API_MODE` changes the data source with no component changes; unit tests for refresh and error mapping |
| F-06 | Fixtures: fake customer, 2 loans (one overdue partial-paid matching 12.4, one closed), 100-EMI schedule, 40+ transactions | Mock adapter serves all endpoints in Section 10.4 with data consistent with the invariants |
| F-07 | UI primitives: Button, Text, Card, Chip/StatusBadge, ListRow, Skeleton, ErrorState, EmptyState, OfflineBanner, BottomSheet, OtpInput | Storybook-style demo screen or component tests; accessible labels; dark mode |

### Phase 1: Mobile (on mock first, then live)
| ID | Task | Acceptance criteria |
|---|---|---|
| M-01 | Boot flow (S1), config check, force-update and maintenance screens | Simulated `updateRequired`/`maintenance` blocks the app |
| M-02 | Login and OTP screens (S2, S3) with validation, countdown, autofill attributes, error states | All error codes from 10.2 produce the right message; no `READ_SMS` permission in manifest |
| M-03 | Session management: SecureStore refresh token, in-memory access token, auth guard in Router, logout | Kill and reopen the app keeps the session; logout clears everything (M6) |
| M-04 | App lock (S4a, S4b) | Lock after 60 s background; 5 failures force OTP login |
| M-05 | Home (S5) with Loan Cards and totals | Matches fixtures; skeleton, empty, error states; pull-to-refresh |
| M-06 | Loan Overview (S6) | Every row from 8.6 rendered; outstanding formula visible in numbers; no payment button or link anywhere; optional Key facts section appears only when data is present; "payments are not made in this app" disclaimer visible |
| M-07 | Schedule (S7) with filters, status badges, auto-scroll to next due, FlashList | Smooth with 600 rows; filter counts match summary |
| M-08 | History (S8) with infinite scroll and detail bottom sheet | Pages load via cursor; no duplicate rows |
| M-09 | Profile, Settings, Help, Legal (S9 to S12) including account deletion flow | Deletion calls `DELETE /me`, logs out, shows confirmation |
| M-10 | Accessibility and i18n pass; 200% font scale; dark mode | No clipped text; all strings in `en.json` |
| M-11 | Maestro E2E flows | Flows pass on CI emulator or documented manual run |
| M-12 | Store assets, icons, splash, `app.config.ts` (bundle IDs, permissions, privacy manifest), EAS profiles | `eas build` succeeds for preview on both platforms |

### Phase 1: API
| ID | Task | Acceptance criteria |
|---|---|---|
| A-01 | Fastify app, env validation, logging, error handler, health endpoints | Boot guards (15.1 S10) tested |
| A-02 | App-owned schema migrations (14.4) | Migrations run up and down on docker MySQL |
| A-03 | `SmsProvider` interface with Console and MSG91 implementations | OTP never logged in production mode |
| A-04 | Auth module: OTP request/verify, JWT, refresh rotation, logout, audit log, rate limits | All behaviours in Section 11 covered by integration tests |
| A-05 | `LoanRepository`: **Mock** implementation (fixtures), then **MySQL** implementation after `DB_MAPPING.md` is filled | Cross-customer test passes on both implementations |
| A-06 | DTO whitelist mappers and blacklist contract test (Appendix B) | Test fails if any blacklisted key appears |
| A-07 | `ScheduleProvider` (computed and db) wired to `/schedule` and loan summary derivation | Responses equal the golden expectations in 12.4 for fixture data |
| A-08 | Loans endpoints (`/loans`, `/loans/:id`, `/schedule`, `/transactions`) | Contract validated; invariants hold |
| A-09 | `/me`, `DELETE /me`, `/config` | Deletion revokes sessions, writes audit, returns 202 |
| A-10 | Dockerfile, docker-compose (local MySQL seed), `docs/DB_ACCESS.md` with `GRANT` statements, deployment doc | `docker compose up` gives a working local stack |
| A-11 | Load test (k6 or autocannon) at expected capacity | p95 < 500 ms; no errors at 500 concurrent users on a small instance |

### Phase 1: Release
| ID | Task | Acceptance criteria |
|---|---|---|
| R-01 | Staging deploy with anonymised data; mobile `live` mode against staging | E2E flows pass on staging |
| R-02 | Data parity QA (Section 18.2) | Signed off with zero mismatches |
| R-03 | Compliance review by client; privacy policy and store forms completed | Written approval from client compliance |
| R-04 | Reviewer demo account on isolated review backend | Documented in review notes |
| R-05 | Submit to TestFlight and Play internal testing, then production with staged rollout | Both stores approved. **Requires R-03, R-04, R-06 and R-07 to be complete.** |
| R-06 | Client compliance written decision on RBI CIMS reporting / DLA classification (Q16) and Google Play classification (Q18); report on CIMS if advised | Written decision stored in `docs/DECISIONS.md`; if reporting is required, the app appears in RBI's DLA directory before submission |
| R-07 | Prepare store review notes and listing text from Appendix F with real values filled in | Reviewed by client; no placeholder values remain; demo account verified end to end |

### Phase 2 (outline tasks)
P2-01 Push registration and notification service and scheduler. P2-02 Deep links. P2-03 (removed: payments are out of scope). P2-04 Hindi translations and language switcher. P2-05 Encrypted offline cache. P2-06 Certificate pinning with rotation plan.

---

## 21. Engineering conventions for agents

- **Language/style:** TypeScript strict, no `any` (use `unknown` and narrow), no default exports except Expo Router screens, functional React components and hooks, named exports elsewhere.
- **Folder discipline:** UI in `components/`, data hooks in `features/*/queries.ts`, no API calls inside components (use hooks).
- **Naming:** `camelCase` code, `PascalCase` components/types, `SCREAMING_SNAKE` env vars and error codes, `snake_case` DB columns.
- **Money/date:** only via `@app/shared` helpers. Lint rule or code review MUST reject `parseFloat` on money, `toFixed` for money, or `new Date()` for IST logic outside `dates.ts`.
- **Errors:** API throws typed `AppError(code, httpStatus, details?)`. A single error handler serialises to the format in 10.2. Mobile maps `code` to i18n messages.
- **Commits:** Conventional Commits (`feat(mobile): ...`, `fix(api): ...`), referencing task IDs (`M-05`).
- **PRs:** small, one task each, including tests and updated `openapi.yaml` where applicable.
- **Docs:** update `docs/DECISIONS.md` for every assumption you make. Update `.env.example` whenever you add a variable.
- **Dependencies:** prefer Expo-supported packages. Justify any new dependency in the PR. No unmaintained libraries.
- **Do not:** add analytics SDKs that collect personal data, add features not in this PRD, expose extra fields "just in case", bypass the repository layer, or add any payment, loan-application, offers/marketing, advertising, or third-party-lender feature (Section 0, rule 11).

### 21.1 Definition of Done (every task)
1. Acceptance criteria met. 2. Unit/integration tests added and passing. 3. Lint and typecheck clean. 4. No new accessibility regressions. 5. No secrets or PII committed or logged. 6. `openapi.yaml`, `.env.example` and docs updated. 7. Works in both `mock` and `live` mode (where applicable).

---

## Appendix A: Web app field mapping (from the client's staff screen)

The client's web app loan screen shows the fields below. Right column is how each maps to this app. (The screenshot contains **real customer data**: do not store it in the repo and use only fake data in fixtures.)

| Web app label (sample value) | App field | Shown to customer? |
|---|---|---|
| Account no. (A04391) | `accountNumber` | Yes |
| Finance Scheme (Regular) | `productName` | Yes |
| Loan Date (15/Jun/2026) | `loanDate` | Yes |
| Interest Date (16/Jun/2026) | `firstInstallmentDate` | Yes |
| Interest (₹20,000) | `financials.totalInterestPaise` | Yes |
| Pay freq. (Daily) | `payFrequency` | Yes |
| EMI (₹1,200 x 100 Daily) | `emiAmountPaise`, `totalInstallments` | Yes |
| Tenure Status (100 / 0) | not mapped; derive installments from schedule | Computed instead (meaning unconfirmed, ask client) |
| Last payment (INR 5,000 on 11 Sep 26) | `lastPayment` | Yes |
| Maturity Date (23-09-26) | `maturityDate` | Yes |
| Branch | `branchName` | Yes |
| Payable Amount (1,20,000; principal 1,00,000 in brackets) | `financials.payablePaise`, `principalPaise` | Yes |
| Total Due | `financials.totalDuePaise` | Yes |
| Total Paid/Credit | `financials.totalPaidPaise` | Yes |
| (+) Late Fee | `financials.lateFeePaise` | Yes |
| (+) Overdue Interest Charge | `financials.overdueInterestPaise` | Yes |
| (+) Recovery Visit Charges | `financials.recoveryChargesPaise` | Yes |
| (-) Discount / Offer | `financials.discountPaise` | Yes |
| (-) Payment Adjusted | `financials.adjustedPaise` | Yes |
| (-) Installment paid | used as `totalInstallmentPaidPaise` for the schedule | Yes (as paid/credited) |
| Total Outstanding Balance | `financials.outstandingPaise` | Yes |
| Payment Breakup: Online paid / Cash paid | `paymentBreakup` | Yes |
| Loan Account (2/2) list | `GET /loans` | Yes |
| Customer name, mobile, photo, area | `Me` | Yes (own data only) |

Sample numbers for fixtures (consistent with the formula): payable 1,20,000 + overdue interest 13,167 = total due 1,33,167; minus paid 39,000 = outstanding 94,167.

## Appendix B: Fields that MUST NEVER be returned by the API

Blacklist (contract test scans response keys, case-insensitive, and fails on any match or near-match):
- Agent name(s), "verified by", staff user names/emails, route number, weekly-off (as a staff field; the schedule may use it internally)
- Internal remarks, notes, red warning text, task data, star ratings, flags, tags, message counts
- Guarantor details, guarantee liability, guarantor loans
- KYC document names, status, files, home-location data
- Other customers' data (including family/guarantor links)
- Internal loan status codes (NPA, legal, recovery stage), collection bucket, risk scores
- Internal IDs that are sequential or guessable, DB table or column names, SQL errors, stack traces
- Staff-only financial fields (commission, agent collection splits, cost of funds)
- The company's payment instruments: payment links, UPI IDs, bank account numbers, QR codes

## Appendix C: Fixture data spec (fake)

```json
{
  "customer": { "customerId": "cu_demo1", "fullName": "Demo Customer", "mobile": "+919999900001", "city": "Demo City" },
  "loans": [
    {
      "loanId": "ln_demo_a", "accountNumber": "A00001", "productName": "Regular",
      "loanDate": "2026-06-15", "firstInstallmentDate": "2026-06-16",
      "principalPaise": 10000000, "totalInterestPaise": 2000000,
      "emiAmountPaise": 120000, "payFrequency": "DAILY", "totalInstallments": 100,
      "financials": { "lateFeePaise": 0, "overdueInterestPaise": 1316700, "recoveryChargesPaise": 0, "discountPaise": 0, "adjustedPaise": 0 },
      "totalInstallmentPaidPaise": 3900000,
      "branchName": "Demo Branch"
    },
    {
      "loanId": "ln_demo_b", "accountNumber": "D00002", "productName": "Monthly",
      "loanDate": "2025-01-10", "firstInstallmentDate": "2025-02-10",
      "principalPaise": 5000000, "totalInterestPaise": 600000,
      "emiAmountPaise": 466667, "payFrequency": "MONTHLY", "totalInstallments": 12,
      "status": "CLOSED", "totalInstallmentPaidPaise": 5600004
    }
  ],
  "demoOtp": "123456",
  "asOfDate": "2026-09-19"
}
```
The mock adapter derives schedule, summary and transactions from these parameters using the same `shared/schedule.ts`. Generate 40+ transactions for loan A (mix of ONLINE and CASH, one ₹5,000 payment on 2026-09-11) summing to `3900000` paise, and a matching set for loan B. (Loan B figures are approximate fixtures; make payments sum exactly to the paid total.)

## Appendix D: Glossary
- **NBFC:** Non-Banking Financial Company, RBI-regulated lender.
- **EMI:** fixed repayment instalment (here may be daily/weekly/monthly).
- **Outstanding balance:** total due minus amounts paid/adjusted.
- **Paise:** 1/100 of a rupee. All money in the API is integer paise.
- **DLT:** TRAI's Distributed Ledger Technology registration required for commercial SMS (including OTP) in India.
- **RBI Digital Lending Directions:** RBI rules on digital lending disclosures, data and grievance handling.
- **IST:** Indian Standard Time (UTC+05:30), the reference time zone for all "today" logic.

## Appendix E: Questions to send to the client (checklist)
1. Is the web app custom-built or third-party software? Is there an existing API or an API from the vendor?
2. Where are the web app and MySQL hosted? Can a server in the same network/VPC be added? Who pays and maintains it?
3. Can we get a read-only DB user, or database views, and a staging copy with anonymised data?
4. Which tables/columns hold each item in Section 14.3? Is there an installment schedule table?
5. What does "Tenure Status 100 / 0" mean? How are weekly-off days and holidays handled? How are payments allocated to EMIs? How are late fee and overdue interest calculated and stored?
6. Which mobile number identifies the customer? Can a number be shared by several customer records?
7. Who owns the Google Play and Apple developer accounts? Does the NBFC have a D-U-N-S number?
8. App name, logo, brand colours, support contacts, grievance officer, RBI registration number, privacy policy and terms URLs.
9. SMS provider and DLT registration status and OTP template.
10. Should the Help FAQ say how to pay? (Static text only; the app has no payment features or links.)
11. Has the client's compliance team decided whether the app must be reported on RBI's CIMS portal as a digital lending app? Does the NBFC already report other apps there?
12. Does the client have an APR and Key Fact Statement per loan (a document URL) that can be shown in the app?
13. Who will write and sign off the store listing text and review notes (Appendix F)?

## Appendix F: Store review notes and listing templates

Fill in every `<PLACEHOLDER>` with real values before submission (task R-07). Never invent registration numbers. Keep statements factual and consistent with the real behaviour of the app.

### F.1 Apple App Store Connect: "Notes for review"
```
APP PURPOSE
<APP_NAME> is a read-only account viewer for EXISTING customers of <NBFC_LEGAL_NAME>,
an NBFC registered with the Reserve Bank of India (Registration No. <RBI_REG_NO>).
Customers can see their existing loan balance, EMI schedule and payment history.

The app does NOT: offer or advertise loans, accept loan applications, disburse funds,
accept or initiate payments, link to payment pages, or perform collection/recovery actions.
No money moves through this app.

SUBMITTED BY THE LENDER
This app is submitted from the developer account of <NBFC_LEGAL_NAME> itself.
<Optional: RBI DLA directory listing / CIMS reference, if applicable: <DETAILS>>

DEMO ACCESS (no SMS is sent on the review backend)
Mobile number: <REVIEW_MOBILE>
OTP: <REVIEW_OTP>
The demo account contains two sample loans (one active with overdue and partially paid
instalments, one closed). All data is fictional.

WHERE TO FIND THINGS
- Account deletion: Profile tab > Settings > Delete my account (confirm with the OTP above).
- Privacy Policy and Terms: Profile tab > Legal.
- Lender details and Grievance Officer: Profile tab > About the lender; Profile tab > Help.
- Optional APR / Key Fact Statement: Loan screen > Key facts (shown when provided by the lender).

PERMISSIONS AND DATA
The app does not request access to contacts, photos, location, SMS, camera or microphone.
Face ID / device passcode is used only for an optional app lock.
Notifications (if present in this build) are informational reminders only.

CONTACT DURING REVIEW
<NAME>, <PHONE>, <EMAIL>
```

### F.2 Google Play Console
**App access (login required):** provide the same demo mobile number and fixed OTP as in F.1, plus the exact steps: open app, enter mobile number, tap Send OTP, enter OTP.

**Store listing, first lines of the full description:**
```
<APP_NAME> lets existing customers of <NBFC_LEGAL_NAME> (RBI-registered NBFC,
Registration No. <RBI_REG_NO>) view their loan balance, EMI schedule and payment history.
This app does not offer loans and does not accept payments.
```

**Financial features declaration:** answer according to the real behaviour (Section 16.2). The app: offers no loans, takes no applications, disburses nothing, accepts no payments, requests no sensitive permissions. Do not select options that do not apply, and do not omit options that do. If a declaration form asks for licence documents, the NBFC provides its RBI registration.

**Data safety form:** data collected: phone number, name, loan/financial information (as displayed to the customer); encrypted in transit; account deletion request available in-app and via the privacy policy URL; data not sold; no third-party sharing other than service providers needed to run the app (SMS OTP provider, hosting, crash reporting), declared accurately.

**Other:** category Finance; developer account name matches `<NBFC_LEGAL_NAME>`; privacy policy URL live and reachable; target API level current at submission time.
