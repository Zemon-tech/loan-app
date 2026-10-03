# Mobile UI/UX: what was built and what is next

Audience: the mobile team picking this up. Covers the UI/UX work done in `apps/mobile`
(Expo SDK 57, Expo Router, React Native StyleSheet + design tokens).

Status: **UI prototype.** All screens, states and navigation exist and typecheck/lint clean
(`npx tsc --noEmit`, `eslint src`). **Data is placeholder, auth is a throwaway in-memory session,
and nothing has been verified on a physical device or simulator yet.** Section 9 lists what is still open.

Companion docs: `PRD.md` (sections 6.4 and 8 are the source for tokens and screens),
`docs/DECISIONS.md`, `apps/mobile/AGENTS.md` (Expo rules: use `npx expo install`, check versioned docs).

---

## 1. Product rules the UI must keep

- **Tracker only.** No payment button, link, UPI ID, QR code or bank detail anywhere. The FAQ answer
  for "How do I pay my EMI?" is static text. Several screens carry: *"This app shows your loan
  information only. Payments are not made in this app."*
- **Simple first.** Big clear numbers, plain words, few taps. Mid-range Android phones are the target.
- **Never confuse the four amounts.** Every number is labelled: Outstanding, Overdue, Next due, Total
  payable / due. Do not show a bare number.
- **Status is never colour alone.** Always colour + icon + text (`StatusBadge`).
- **No raw errors.** No status codes, stack traces or technical text in the UI.

## 2. Design system

Single source of truth: `src/constants/theme.ts`, used through `useAppTheme()`
(`src/hooks/use-theme.ts`). Never hardcode a colour or size in a component.

| Area | Tokens |
|---|---|
| Core colours | `primary`, `onPrimary`, `background`, `surface`, `textPrimary`, `textSecondary`, `border`, `success`, `warning`, `danger`, `info` |
| Surface tints (added) | `canvas` (lavender page tint `#F9F9FF`), `card` (white card), `primarySoft`, `successSoft`, `dangerSoft`, `warningSoft` |
| Spacing | 4 / 8 / 12 / 16 / 24 / 32 (`xs` to `xxl`) |
| Radius | `sm 6`, `md 8`, `lg 12`, `xl 20`, `pill` |
| Type | caption 13, body 16 (minimum), subtitle 18, title 22, heading 28. Respect OS font scaling. |
| Touch target | 44 minimum |

Light and dark both exist and follow the OS. Pages use `tone="canvas"` with `tone="card"` cards on top.
Icons are Ionicons (`@expo/vector-icons`) via the `Icon` wrapper, coloured by role, never by hex.

### Page spacing and safe areas (`ScreenContainer`)

`ScreenContainer` applies the real safe-area insets (the old React Native `SafeAreaView` only worked on
iOS, so headers slid under the Android status bar).

- Top: status-bar inset + 12. Sides: 16. Between blocks: 16.
- Bottom: home-indicator inset + 24. Screens shown **above the tab bar** (Home, Profile) pass
  `bottomInset={false}` because the tab bar owns that inset.
- Tab bar (`(app)/_layout.tsx`): height `60 + inset`, 12 above icons, inset below labels.
- Loan workspace layout adds the top inset itself; its scrolling screens add the bottom inset.
- New screens: wrap in `ScreenContainer`. Use `bottomInset={false}` only inside the tab bar.

### Shared components (`src/components/ui`, import from `@/components/ui`)

| Component | Use |
|---|---|
| `ScreenContainer`, `ScreenHeader`, `BrandHeader` | Page shell, back + title header, auth header with brand mark |
| `Button` | `primary`, `secondary`, `danger`, `ghost`; left/right icons; loading |
| `Card`, `IconTile`, `Pill`, `StatusBadge`, `ProgressBar`, `BrandMark`, `Icon` | Building blocks |
| `OtpInput` | 6 cells, one hidden input, SMS autofill, `hasError`, `disabled` |
| `SegmentedControl` | Overview / Schedule / History |
| `SettingsGroup`, `SettingsRow`, `SectionLabel`, `Toggle` | Profile and Settings lists, 48x28 switch with check |
| `BottomSheet`, `ConfirmSheet`, `OptionRow` | Sheets on RN `Modal` (no extra dependency) |
| `Skeleton`, `SkeletonGroup` | Loading placeholders (reduce-motion aware) |
| `StateView`, `StateScroll` | Empty / error / info layout |

## 3. Route map

```
/                     Splash / boot (decides where to go)
(auth)/login          Mobile number
(auth)/otp            6-digit code, with error states
(auth)/app-lock-setup First-login App Lock offer
(auth)/unlock         Biometric unlock
/maintenance          Blocking
/update-required      Blocking
/session-expired      Blocking
(app)/loans           Home tab
(app)/account         Profile tab
(app)/account/settings | help | legal | delete        (no tab bar)
(app)/loan/[loanId]   Workspace: index (Overview) | schedule | history   (no tab bar)
```

Boot order (`app/index.tsx`): maintenance → update required → login → unlock (if App Lock on and
locked) → Home. It uses `<Redirect>`, not `router.replace` in an effect, to avoid an unhandled
`GO_BACK` warning on web.

## 4. Screens delivered

**Entry and auth**
- **Splash:** logo, tagline, subtle spinner, 1.2 s minimum.
- **Login:** `+91` field with live `0/10` counter, India mobile validation (`^[6-9]\d{9}$`), SMS note,
  Terms and Privacy links (in-app browser). No sign-up, marketing or payment.
- **OTP:** masked number, change number, 6 cells, 30 s resend countdown, WhatsApp/call support.
  States: wrong code (attempts left), expired (send new code), too many attempts (5 min cooldown).
- **App Lock setup:** benefits list, Enable App Lock (device check) or Not now.
- **Unlock:** auto-prompts biometrics; "Use OTP instead" logs out to login.
- **Update required / Maintenance / Session expired:** blocking, no tab bar.

**Home** (`loans.tsx`): greeting, total outstanding, three labelled stats (Active loans, Overdue, Next
due), **Your loans** using the single reusable `LoanCard` (account, type, status, Outstanding, "N of M
EMIs paid" + bar, Next due, Overdue, chevron). Closed loans sit in a quiet collapsed row.
Works for one loan, several, active + closed, and all closed.

**Loan workspace** (one shared header + segmented control, tab bar hidden)
- **Overview:** outstanding hero, overdue warning (informational), next due, collapsible loan details,
  full amount breakdown (every charge on its own line, zeros shown), paid so far (online/cash), optional
  Key Facts (only when present), disclaimer.
- **Schedule:** context bar with "Jump to #N", summary tiles, All/Paid/Pending/Overdue filters, month
  groups with sticky headers, opens on the next due EMI.
- **History:** type filter + record count, month groups with net amount, tap opens the receipt sheet.

**Profile ecosystem:** Profile (identity, links, lender info, log out), Settings (App Lock, Auto-Lock
interval, notifications, language, log out, delete), Help and Support (contact cards, FAQ accordion,
Grievance Redressal Officer), Legal (lender documents, in-app browser), Delete account
(review → verify by biometrics or OTP → "Request received" with copyable acknowledgement ID).
Sheets: Log out, App Lock on/off confirmation, Language, Auto-lock interval.

**System states:** skeletons for Home, Overview, Schedule and History (same structure as the real
screens); No loans; No transactions (with help sheet); Load error (friendly, "Try again"); Offline
banner (calm, persistent in Home and the workspace); Session expired.

## 5. Behaviour worth knowing

- **Overdue maths is consistent.** Schedules are generated and overdue totals / next due / counts are
  derived from them. Sample: 62 missed EMIs + 1 partly paid = ₹75,000 overdue, shown as "63
  installments".
- **Ledger signs in History:** payments and waivers are credits (+), charges are debits (−),
  adjustments carry their own sign. Monthly header shows "Net".
- **App Lock is enforced.** The app layout locks after returning from background once the chosen
  interval has passed (immediately / 1 min / 5 min) and redirects to Unlock. Only the `background`
  state counts, because the Face ID sheet itself triggers `inactive`. Changing App Lock asks for
  confirmation and a device check.
- **Back navigation.** Segment switches use `replace`, so Back returns to Home. Helpers
  (`goBackOrLogin`, workspace `goBackOrHome`, `ScreenHeader` fallback) avoid the `GO_BACK` warning when
  there is no history (deep link or web refresh).
- **Delete flow** shows the acknowledgement and only logs out when the user taps "Return to login".

## 6. Previewing states (prototype switches)

All are `EXPO_PUBLIC_*` values in `apps/mobile/.env` (see `.env.example`). Restart the dev server after
changing them.

| Variable | Values |
|---|---|
| `EXPO_PUBLIC_MOCK_BOOT` | `ok` · `maintenance` · `update` |
| `EXPO_PUBLIC_MOCK_LOANS` | `multi` (default) · `one` · `active_closed` · `all_closed` · `none` (empty Home) · `new_loan` (empty History) |
| `EXPO_PUBLIC_MOCK_NETWORK` | `ok` · `loading` (skeletons stay) · `error` (first load fails, retry works) · `offline` · `session_expired` |
| `EXPO_PUBLIC_MOCK_DELAY_MS` | latency in ms, default 900, `0` = instant |

OTP test codes: `000000` → expired, `111111` → wrong (three wrong tries starts the cooldown), any other
6 digits succeed. Fixed sample "today" is 19 Sep 2026 (`features/loans/clock.ts`).

## 7. Where things live

```
src/constants/theme.ts            tokens          src/constants/links.ts   placeholder URLs
src/components/ui/                shared UI       src/hooks/use-theme.ts   useAppTheme
src/features/auth/                session (in-memory), format helpers, LogoutSheet
src/features/boot/bootConfig.ts   mock /config (maintenance / update)
src/features/loans/               placeholderData, format (₹ Indian grouping, dates), LoanCard,
                                  WorkspaceHeader, TransactionSheet
src/features/profile/             placeholder lender, support, officer, legal documents
src/features/settings/            preferences (language, notifications, auto-lock), LanguageSheet
src/features/system/              mockQuery, connectivity, Skeletons, SystemStates
```

New dependencies added with `npx expo install`: `@expo/vector-icons`, `expo-local-authentication`
(plugin + Face ID text in `app.json`), `expo-clipboard`, `expo-network`.

## 8. How to extend without breaking the look

1. Build from tokens and `@/components/ui`. If a tint or size is missing, add a token, do not hardcode.
2. Reuse `LoanCard`, `StatusBadge`, `StateView`, `ConfirmSheet`. Do not create a second card style.
3. Every data screen needs loading (skeleton), empty, error and offline handling. Follow
   `loans.tsx` and `loan/[loanId]/index.tsx`: a thin wrapper picks the state, a `*Content` component
   renders the data.
4. Label every financial number. Keep copy plain and calm.
5. Run `npx tsc --noEmit` and `eslint src` before merging.

## 9. Open items and decisions for the team

**To build (replace placeholders)**
- Real API client and data (TanStack Query). `features/system/mockQuery.ts` keeps the state model
  (loading, error, 401 → session expired); `placeholderData.ts` files are to be deleted.
- Real auth: refresh token in SecureStore, access token in memory, boot rehydration, persisted App
  Lock, server-driven OTP errors (`AUTH_INVALID_OTP`, `AUTH_OTP_EXPIRED`, `AUTH_OTP_ATTEMPTS_EXCEEDED`).
- Use `@app/shared` (`formatINR`, dates, `computeSchedule`) instead of the local helpers in
  `features/loans/format.ts`.
- `GET /v1/config` for lender details, support contacts, legal URLs, store URLs and version gates.
- i18n for all strings (Hindi is label-only today). Persist preferences.
- Notifications are a Phase 2 toggle and do nothing yet.
- Replace Schedule's `FlatList` with FlashList for ~600 rows. Add infinite scroll and pull-to-refresh.
- Single-loan shortcut (open the workspace directly for exactly one loan) is documented, not built.
- Delete account should call `DELETE /v1/me` and verify the OTP for real.

**Needs a decision / sign-off**
- **Compliance and legal copy.** Lines such as "RBI regulated", the lender category, the grievance SLA,
  "256-bit encrypted" and the deletion/retention wording are placeholders. Legal must approve them.
  We removed unverifiable claims from the mockups (for example "UIDAI compliant", "RBI NACH Gateway",
  specific retention periods, "Verified via CBS").
- **Mockup items intentionally not built:** download/share statement, inline legal reader, WhatsApp OTP
  delivery, biometric resume of an expired session, "Change App Lock Method", staff photos.
- **Notification bell** is omitted until Phase 2.

**Verification gaps**
- Not run on a simulator or device. Check safe-area spacing on iOS, Android (gesture and 3-button
  nav) and small phones, 200% font scale, and dark mode.
- Web export (`expo export --platform web`) was not completed; confirm routes bundle.
- Lint still reports three older issues outside this work: duplicate imports in `src/app/_layout.tsx`
  and a `set-state-in-effect` error in `src/hooks/use-color-scheme.web.ts`.
- Accessibility: roles, labels and live regions are in place, but a screen-reader pass (TalkBack and
  VoiceOver) is still needed.
