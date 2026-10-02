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

<!-- Add new rows above. Keep newest at the bottom of each topic. -->
