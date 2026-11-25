# Plan: Light-only theme + simplified login

Status: APPROVED DECISIONS (answers recorded in section 5). Ready to implement.
Scope: `apps/mobile` only. No API, contract or `@app/shared` change expected.

## 1. Context (what the code does today)

**Theme**
- Tokens live in `src/constants/theme.ts` (`AppColors.light` and `AppColors.dark`). Components read them through `useAppTheme()` (`src/hooks/use-theme.ts`).
- `useAppTheme()` picks light or dark from the system setting via `useColorScheme()`.
- `app.json` has `"userInterfaceStyle": "automatic"`, so the OS can switch the app to dark.
- `src/app/_layout.tsx` builds the navigation theme from `DarkTheme` or `DefaultTheme` by scheme, and renders `<StatusBar style="auto" />`.
- Hardcoded colours outside the tokens: splash colour `#fddc69` (`app.json`, `_layout.tsx`, `index.tsx`) and a shadow colour in `Card.tsx`. These are the same in both schemes, so they are fine for light-only.

**Login** (`src/app/(auth)/login.tsx`)
- Layout: `BrandMark` (120px) and `COMPANY_NAME` ("ALANG CREDITS AND HOLDINGS PVT LTD") at the top. Below, in a bottom block: the "Welcome" heading, the paragraph "Enter your registered mobile number to view your loan records...", the label "Registered Mobile Number" with a `n/10` counter, the input (flag, +91, divider, field), a helper line ("We will send a 6-digit verification code via SMS") or an error line, and a Continue button.
- Validation: `INDIAN_MOBILE = /^[6-9]\d{9}$/` and `sanitizeMobile` (strips non-digits, cuts at 10) in `features/auth/format.ts`. An error shows only when 10 digits are typed and invalid, or when the server returned an error.
- Submit flow: calls `startLogin()` first, then `endpoints.otpRequest()`. In mock mode it skips the API and goes straight to `/otp`.
- Error mapping: `BAD_REQUEST` gets a fixed message. Everything else goes through `friendlyMessage()` in `features/api/errors.ts`, which is already non-technical and does not reveal whether a number is registered.

**Gaps found (relevant to your "robust" and "no dummy data" requirements)**
1. `onContinue` has no `try/catch/finally`. If `otpRequest` throws, `submitting` stays `true` and the button spins forever.
2. `startLogin()` runs before the OTP request succeeds, so a failed request leaves a half-started login in session state.
3. Pasting `+91 98765 43210`, `098765...` or `91...` is truncated to the wrong 10 digits by `sanitizeMobile`.
4. There is no logging layer in the app (no `console`/logger usage found). Only `EXPO_PUBLIC_SENTRY_DSN` exists as an env placeholder. I have not yet confirmed whether Sentry is installed.
5. **Dummy data can reach real users.**
   - `apiMode()` returns `'mock'` unless `EXPO_PUBLIC_API_MODE=live` is set, and `eas.json` sets no env for any build profile. A build made without that variable runs on fake loans and a fake customer (`features/loans/placeholderData.ts`, used by `features/api/dataSource.ts`).
   - Even in live mode, `help.tsx`, `legal.tsx`, `delete.tsx` and `SystemStates.tsx` import `PLACEHOLDER_LENDER`, `PLACEHOLDER_SUPPORT` and `PLACEHOLDER_GRIEVANCE_OFFICER` (fake phone numbers, RBI number, emails, legal-document dates) from `features/profile/placeholderData.ts`.

**Web check (Expo docs, SDK docs page "Color themes")**
- `userInterfaceStyle: "light"` restricts the app to light. On Android in a dev/production build it is ignored unless `expo-system-ui` is installed. I still need to check that it is in `package.json` (my search for it failed on a regex error).

## 2. Decisions made

| # | Decision | Reason |
|---|----------|--------|
| D1 | Lock light mode at three levels: `app.json` `userInterfaceStyle: "light"` (plus `expo-system-ui` if missing), `useAppTheme()` always returns `light`, `StatusBar style="dark"`, navigation theme always `DefaultTheme`. | The OS setting can then never produce a dark screen, including native chrome (keyboard, alerts, status bar). |
| D2 | Keep the `AppColors.dark` tokens in place. `useAppTheme()` resolves the scheme through one function (`resolveScheme()`) that returns `light` today, so a future in-app toggle only changes that function and adds a stored preference. The toggle itself is out of scope now. | You want a toggle later. Smallest, reversible change. |
| D3 | Golden ratio (φ ≈ 1.618) applied through tokens, not magic numbers. Layout: login screen height split 38.2% (brand zone) / 61.8% (form zone). Type steps: 16 (body) → 26 (heading, 16×φ). Spacing: Fibonacci steps 8, 13, 21, 34, 55. Input and button height: 55 (34×φ). Touch target stays ≥ 44. | Keeps one source of truth in `theme.ts`, and other screens are untouched. New tokens are added, existing ones are not renamed. |
| D4 | "By Laxmi Group" is rendered in small text directly under the company name. Minimum 12px, not 10px. | φ-steps suggest about 10px, but below 12px is hard to read for non-technical and older users. |
| D5 | Remove the "Enter your registered mobile number to view..." paragraph. Also remove the `n/10` counter (visual noise). | Your request for the simplest possible screen. |
| D6 | Validation is checked in this order: (a) first digit not 6-9 → shown immediately, (b) fewer than 10 digits → shown on blur or on Continue tap, not while typing, (c) valid → Continue enabled. Pasted numbers are normalised (strip spaces, dashes, `+91`, `91`, leading `0`). | Never scold the user mid-typing. Pasting works. |
| D7 | Messages are plain sentences, no jargon. Examples: "Please enter your 10-digit mobile number." / "Mobile numbers start with 6, 7, 8 or 9." / "No internet. Please check your connection and try again." / "Too many attempts. Please wait a few minutes." / "Something went wrong. Please try again." Reuse `friendlyMessage()` for server cases. Messages never reveal whether a number is registered (existing rule). | Matches the existing non-revealing error policy. |
| D8 | Submit flow becomes `try/catch/finally`. `startLogin()` is called only after the request returns success. `submitting` is always reset in `finally`. | Fixes gaps 1 and 2. |
| D9 | Add a tiny logger (`src/lib/logger.ts`): levels, a tag per feature, and a redaction rule that never logs mobile numbers, OTPs or tokens. Dev: console. Release: forward `warn`/`error` to Sentry only if it is already installed, otherwise no-op. | Gives proper logging without leaking PII. No new dependency by default. |
| D10 | Dummy data guard: release builds must not use mock mode. `apiMode()` defaults to `live` when `__DEV__` is false, and `mock` is available only in dev with an explicit env. `eas.json` `preview` and `production` set `EXPO_PUBLIC_API_MODE=live`. | Fixes gap 5, first bullet. |
| D11 | For now the lender, support and grievance-officer details stay as the existing placeholder values (your decision, Q4). They are centralised so the real values can be dropped in later from one place. This is logged in `DECISIONS.md` as a known release blocker: real values must replace them before store release. | You will supply the real values later. |

## 3. Phased to-do

### Phase 0: Baseline (before any edit)
- [ ] Record the current state: `npx tsc --noEmit`, `npx expo lint`, and the shared tests, so later failures can be told apart from existing ones.
- [ ] Confirm whether `expo-system-ui`, `expo-status-bar` and Sentry are in `package.json`.
- [ ] Take reference screenshots of login, OTP, loans, loan detail, account, help, legal in the current build.

### Phase 1: Light-only theme
- [ ] `app.json`: `userInterfaceStyle` → `"light"` (top level and Android). Install `expo-system-ui` via `npx expo install` if it is missing.
- [ ] `use-theme.ts`: always return the light theme. Update the doc comment.
- [ ] `_layout.tsx`: navigation theme from `DefaultTheme`, `StatusBar style="dark"`.
- [ ] Search for any other `useColorScheme` use (only `use-color-scheme*.ts` and `_layout.tsx` were found) and for hardcoded dark-only colours.
- [ ] Check every screen under a device set to dark mode: no dark backgrounds, no light-on-light text, keyboard and status bar look right.

### Phase 2: Dummy-data safety (blocks release)
- [ ] `config.ts`: release builds default to live. Mock requires `__DEV__` and an explicit env.
- [ ] `eas.json`: set `EXPO_PUBLIC_API_MODE=live` and the base URL for `preview` and `production`.
- [ ] Keep the lender/support/grievance placeholders for now. Log the pending real values in `DECISIONS.md` as a release blocker. Do not extend placeholder use anywhere new.
- [ ] Add a startup check that logs an error if a release build ever resolves to mock mode.
- [ ] Update `.env.example`, `docs/SETUP.md`, `docs/DECISIONS.md`.

### Phase 3: Login redesign
- [ ] `theme.ts`: add φ-based tokens (`AppGolden`: ratio, Fibonacci spacing, 38.2/61.8 split, 55 control height).
- [ ] `format.ts`: add `normalizeMobile()` for pasted input, plus `validateMobile()` returning a reason code (`EMPTY`, `TOO_SHORT`, `BAD_START`, `OK`). Unit-test them (cases: paste with +91, 0, 91, spaces, dashes, letters, 9 digits, 11 digits, start digits 0-5).
- [ ] `brand.ts`: add `COMPANY_PARENT_TAG = 'By Laxmi Group'`.
- [ ] `login.tsx`: brand zone (logo, company name, "By Laxmi Group") in the top 38.2%. Form zone in the bottom 61.8%: heading, label "Mobile number", input, error line, Continue button. Remove the paragraph and counter. Keep helper text only if Q2 says so.
- [ ] Rewrite `onContinue` per D8. Map all error kinds to user messages per D7.
- [ ] Accessibility: labels, `accessibilityLiveRegion` for errors, `autoComplete="tel"`, large text scaling (use `ScrollView` so nothing clips at 200% font size), small screens (≤ 640px high) and keyboard open.
- [ ] Add logger calls: request started/succeeded/failed with error kind only, never the number.

### Phase 4: Logging
- [ ] Add `src/lib/logger.ts` with redaction (D9). Use it in the login flow and `endpoints.otpRequest` failure path.
- [ ] If Sentry is installed, wire `warn`/`error` to it in release only.

### Phase 5: Verification
- [ ] `npx tsc --noEmit`, `npx expo lint`, `npm test` (shared + new format tests) all pass.
- [ ] Manual login matrix: valid number, 9 digits, starts with 5, paste `+91 98765 43210`, airplane mode, 429, 5xx, request timeout, double-tap on Continue, background and return during the request.
- [ ] Compare against Phase 0 screenshots. Only the intended screens differ.
- [ ] Test a release-profile build: no mock data anywhere, mock env is ignored.
- [ ] Test on a small phone (360×640), a large phone, with system font size at maximum, and with system dark mode on.

## 4. Definition of done
1. The app is light on every screen even when the phone is set to dark mode (status bar, keyboard and navigation transitions included).
2. The login screen shows: logo, company name, "By Laxmi Group" in small text, a mobile number field, and a Continue button. The "Enter your registered mobile number to view..." paragraph is gone.
3. Brand and form zones follow 38.2/61.8. Type, spacing and control sizes come from the φ tokens, and no new hardcoded sizes appear in the component.
4. Each invalid input case in D6 shows a plain-language message. Pasted numbers in any common format are accepted. Unit tests cover all cases.
5. A thrown error, a timeout or an offline state never leaves the button stuck, and never exposes technical text or status codes. Session state is unchanged when the request fails.
6. Logs exist for the login flow, contain no mobile numbers, OTPs or tokens, and only errors reach Sentry in release.
7. In live mode the app never shows mock loans or a mock customer. A release build cannot start in mock mode by accident. Placeholder lender/support/grievance details remain until you provide real values, and are tracked as a release blocker.
8. `tsc`, lint and tests pass. No regression versus Phase 0 screenshots on non-login screens.
9. `.env.example`, `SETUP.md`, `README.md` (if commands changed) and `DECISIONS.md` are updated. No payment, offer or collection element is added (AGENTS.md rule).

## 5. Answers recorded
- Q1. Light only now. An in-app toggle comes later (see D2).
- Q2. Keep the line "We will send a 6-digit verification code via SMS".
- Q3. Text is "By Laxmi Group". The company line stays "ALANG CREDITS AND HOLDINGS PVT LTD".
- Q4. You will supply real lender/support/grievance values later. Placeholders stay for now (D11).
- Q5. Mock mode shows fake data. Live mode never shows fake data. When the API is unreachable in live mode the app shows the offline/error state, not fake data. (D10 still applies: release builds default to live, so mock needs an explicit dev setting.)
- Q6. Keep the heading. Wording: "Log in" or "Welcome"? Default to the existing "Welcome" unless you say otherwise.
