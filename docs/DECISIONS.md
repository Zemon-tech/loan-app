# Decisions log

Every assumption or decision made by an agent/developer where the PRD left an `[OPEN]`
item or an ambiguity must be recorded here (PRD Section 0, rule 10).

| Date | ID / topic | Decision | Rationale |
|---|---|---|---|
| 2026-10-02 | Project structure | Monorepo via **npm workspaces** (`shared`, `apps/mobile`, `apps/api`). | Matches PRD Section 7.2. |
| 2026-10-02 | Expo SDK | Target **SDK 57** (RN 0.86 / React 19.2), `expo@57.0.17+`. | Latest stable; fixes Hermes memory/startup regression. |
| 2026-10-02 | Mobile routes location | Routes live in `apps/mobile/src/app` (not top-level `app/`). | SDK 55+ default template convention; PRD predates it. |
| 2026-10-02 | Styling approach | **Design tokens + React Native `StyleSheet`.** Tailwind/NativeWind (and Tamagui/unistyles) are NOT used. | Matches PRD 6.4 (tokens, no hardcoded values, strict status colours, a11y). Avoids an extra build-step dependency on a brand-new SDK 57; keeps app size and `npm audit` clean. |
| 2026-10-02 | Theme file location | Tokens live in **`apps/mobile/src/constants/theme.ts`** (the template's generated theme file), as `App*` exports (`AppColors`, `AppSpacing`, …) added alongside the template's `Colors`/`Spacing`/`Fonts`. Consumed via `useAppTheme()` in `src/hooks/use-theme.ts`. A separate `src/theme/tokens.ts` was created then removed to avoid two theme files. | PRD 6.4 named `src/theme/tokens.ts`, but the SDK 57 template already ships `src/constants/theme.ts` and its starter screens import from it. One file (the template's) avoids a duplicate source of truth; the template exports stay intact so generated screens keep working. |
| 2026-10-02 | Starter screens removed | Deleted all `create-expo-app` demo screens/components; app currently renders one blank screen. | Clean slate to build the real screens (see "Mobile screen map" below). |
| 2026-10-02 | Mobile screen map & UX | Agreed screen inventory, navigation, and simplicity rules. See **"Mobile screen map & UX decisions"** section below. | Simplicity is the top product priority (audience: mid-range phones, possibly Hindi-first, less tech-comfortable). Refines PRD Section 8 for ease of use. |
| 2026-10-02 | Shared test runner | `@app/shared` uses **Vitest** (`npm test` → `vitest run`). | Fast, zero-config TS/ESM; PRD 6.2 lists Vitest as an option. Root `test`/`typecheck` delegate to the shared workspace for now. |
| 2026-10-02 | Shared module layout | `shared/src`: `money.ts`, `dates.ts`, `schedule.ts`, `types/schedule.ts`, `index.ts` barrel. ESM (`"type":"module"`), relative imports use `.js` extensions. `formatINR` shows **whole rupees** (paise dropped) with Indian grouping; dates are IST calendar dates (UTC-anchored, no off-by-one). | Implements PRD §10.1, §12. Golden test (§12.4) + 40 more tests pass; strict typecheck clean. |
| 2026-10-02 | Screen prototype | Barebone navigable prototype of all screens built (see **"Mobile prototype"** section below). Placeholders + `TODO` markers; a throwaway in-memory session gates the tabs. | Gives other devs a navigable foundation to build real screens/data on. Not production code. |

<!-- Add new rows above. Keep newest at the bottom of each topic. -->

---

## Mobile prototype (2026-10-02)

A **barebone, navigable prototype** of every screen in the map below. It is a foundation for
other devs — **not production code**. Conventions:

- **Structured skeletons:** each screen blocks out the real layout regions with static
  placeholder values. Every screen has a header comment with a `TODO (task-id)` listing what
  real work remains (API calls, states, i18n, etc.).
- **Throwaway session:** `src/features/auth/session.tsx` is an in-memory `SessionProvider`
  (`isLoggedIn` flag). Login → OTP → "Verify" flips the flag and enters the tabs. Replace with
  real auth in M-03. **No real OTP/JWT logic yet.**
- **Placeholder data:** `src/features/loans/placeholderData.ts` holds 2 fake loans. Replace
  with the mock/live API adapter (F-05/F-06); derive schedule via `@app/shared`.
- **UI primitives:** `src/components/ui/` — `Button`, `Card`, `ListRow`, `StatusBadge`,
  `ScreenContainer`. All token-based via `useAppTheme()`. Compose screens from these.
- **Plain strings for now:** text is inline with `TODO: i18n` (i18next setup is a later task).
- **Icons:** text glyphs stand in for real icons (tab bar + status badges) — `TODO: real icons`.
- **Routing:** Expo Router with `typedRoutes`; dynamic nav uses the href-object form
  (`router.push({ pathname: '/loan/[loanId]', params: { loanId } })`). Route types regenerate
  when `npx expo start` runs.
- **Single-loan shortcut (decision b):** the prototype's My Loans tab always shows the list
  (2 placeholders) so the screen is visible; the real "1 loan → open detail directly" rule is
  a documented `TODO` in `loans.tsx`.

Verified: `npx tsc --noEmit` clean. Not yet run visually in a simulator.

### Route files
```
src/app/_layout.tsx                         SessionProvider + root stack
src/app/index.tsx                           redirect → /loans or /login
src/app/(auth)/_layout.tsx                  auth stack
src/app/(auth)/login.tsx                    S2 Login
src/app/(auth)/otp.tsx                      S3 OTP
src/app/(app)/_layout.tsx                   tabs + auth gate (My Loans, My Account)
src/app/(app)/loans.tsx                     S5 loan list
src/app/(app)/loan/[loanId]/index.tsx       S6 loan overview
src/app/(app)/loan/[loanId]/schedule.tsx    S7 schedule
src/app/(app)/loan/[loanId]/history.tsx     S8 history
src/app/(app)/account.tsx                   S9 account
src/app/(app)/account/settings.tsx          S10 settings (+ logout)
src/app/(app)/account/help.tsx              S11 help
src/app/(app)/account/legal.tsx             S12 legal
src/app/(app)/account/delete.tsx            S10 delete account
```

---

## Mobile screen map & UX decisions (2026-10-02)

Agreed with the product owner. This refines PRD Section 8 and is the **build reference** for
the mobile UI. Guiding principle: **the app must be easy for anyone to use** — the audience is
existing borrowers on mid-range Android phones, possibly Hindi-first, possibly less comfortable
with technology. Prefer fewer taps, big clear numbers, plain words, and calm screens over
feature density.

### Navigation tree

```
Login (mobile number)
  → OTP verification
      → Tabs (bottom, 2 only):
          ├── 📋 My Loans
          │     • If the customer has exactly 1 loan  → open its Loan Detail directly (no list)
          │     • If 2+ loans → Loan List → tap a card → Loan Detail
          │
          │     Loan Detail (Overview):
          │       • BIG "Outstanding ₹94,167" + plain line "32 of 100 EMIs paid" + next due date
          │       • [See full breakup]  → expands the charge lines in place (collapsed by default)
          │       • Button: [View EMI schedule]    → Schedule screen
          │       • Button: [View payment history] → History screen
          │
          └── 👤 My Account
                • Name, mobile, area
                • About the lender (legal name, RBI registration no.)
                • Help & Support (incl. Grievance Redressal Officer)
                • Privacy Policy / Terms
                • App lock (on/off)
                • Delete my account
                • Log out
                • App version
```

### Decisions

1. **Two bottom tabs only:** *My Loans* and *My Account*. No separate Help/Support tab
   (Help lives inside My Account). (Maps to PRD S5 Home + S9 Profile, renamed for friendliness.)

2. **Single-loan shortcut (option b):** when `loans.length === 1`, the My Loans tab renders that
   loan's detail directly — no list-of-one. The list appears only for 2+ loans. Back behaviour:
   from a single-loan detail, "back" stays on the tab (there is no empty list to pop to).

3. **Loan Detail uses buttons, not a segmented toggle.** Schedule and History are reached via two
   clear tappable rows/buttons, each opening its own screen with a back arrow. (Deviation from the
   PRD's Overview|Schedule|History segmented control — chosen for a simpler mental model.)

4. **Information hierarchy on Loan Detail:** the outstanding amount is the single most prominent
   element; the full charge breakdown (payable, late fee, overdue interest, recovery charges,
   discount, payment adjusted, installment paid — PRD 8.6 / C3) is **collapsed by default** behind
   "See full breakup", so the default screen stays calm. Every legally-required charge line is
   still shown when expanded.

5. **Plain language + accessibility:** use everyday wording (e.g. "Amount you still owe" alongside
   "Outstanding"); keep the familiar term "EMI" paired with its rupee amount. Status is always
   conveyed as **word + colour + icon**, never colour alone. Indian currency grouping via
   `formatINR` (e.g. `₹1,33,167`). Support OS font scaling to 200%.

6. **Account Settings location:** Settings, Help, Legal, and Delete-account all live **inside the
   My Account tab** (as rows that open sub-screens), not as separate top-level tabs.

### Fields from the staff web app that MUST be excluded (customer app)

The client's internal screen (see PRD Appendix A) shows staff-only data that is **blacklisted**
(PRD Appendix B) and must never appear in the customer app:

- Agent name(s), "Verified by", Route No.
- Guarantor details / guarantee liability (and the Guarantor tab)
- Internal notes / messages / remarks / star ratings
- KYC documents / status
- "Weekly Off" as a displayed field (the schedule may use it internally only)
- "Tenure Status (100 / 0)" — meaning unconfirmed (PRD Q5/Appendix A); do **not** display it.
  Derive "paid / remaining" from the computed schedule instead.
- Any payment instrument or action: "Pay via UPI", payment links, QR codes, bank details
  (the app is tracker-only — PRD scope guard, Section 0 rule 11).

### Screen inventory (for build tracking)

| Screen | PRD ref | Notes |
|---|---|---|
| Login (mobile no.) | S2 | Existing customers only; no registration |
| OTP verification | S3 | 6-digit; autofill; no READ_SMS permission |
| Loan List | S5 | Only shown for 2+ loans; total outstanding on top |
| Loan Detail (Overview) | S6 | Big outstanding + progress + next due; collapsed breakup; 2 buttons |
| Schedule | S7 | EMI list, status badges, filters, jump-to-next-due |
| History | S8 | Transactions grouped by month; infinite scroll |
| My Account | S9 | Profile + rows into Settings/Help/Legal/Delete |
| Settings / Help / Legal / Delete | S10–S12 | Sub-screens off My Account |
