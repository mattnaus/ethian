# Review: Inbox Redesign (v0-inspired) — `7ae98d6`

**Date:** 2026-03-12
**Commits reviewed:** `7ae98d69`
**Files reviewed:** `src/app/globals.css`, `src/app/(app)/inbox/page.tsx`, `src/app/(app)/inbox/_components/inbox-view.tsx`, `src/app/(app)/inbox/_components/email-card.tsx`, `src/app/(app)/inbox/_components/search-command.tsx`, `src/lib/email-display.ts`, `src/components/ui/popover.tsx`, `messages/en.json`, `package.json`

---

## Summary

Solid redesign that introduces a well-structured inbox view with date grouping, account filtering, expandable search, and a folder switcher. The component decomposition is clean and the mobile/desktop split is thoughtful. The OKLCH color migration in globals.css is a meaningful improvement. Main concerns are hardcoded UI strings that bypass i18n, a category color system left in an inconsistent state (HSL values that no longer resolve), and the mobile FAB not accounting for safe-area insets when the bottom tab bar is present.

---

## Critical Issues

None.

---

## Warnings

### Hardcoded "Gatekeeper" and "Accounts" strings bypass i18n
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:238`, `src/app/(app)/inbox/_components/inbox-view.tsx:299`, `src/app/(app)/inbox/_components/inbox-view.tsx:167`
**Problem:** The strings `"Gatekeeper"` (lines 238 and 299, inside the desktop and mobile Gatekeeper buttons) and `"Accounts"` (line 167, the filter popover heading) are hardcoded in English. Every other visible string in this component uses `useTranslations`. The `gatekeeperButton` key already exists in `messages/en.json` but is unused here.
**Fix:** Replace the hardcoded `"Gatekeeper"` with `t("gatekeeperButton", { count: screenerCount })` or a new dedicated key. Replace `"Accounts"` with a new i18n key under `pages.inbox` (e.g. `"accountsHeading"`).

### Category color CSS variables are still raw HSL, orphaned from the new OKLCH system
**File:** `src/app/globals.css:45-50`
**Problem:** The six `--color-inbox` through `--color-reply-later` variables are still bare HSL triplets (e.g. `217 91% 60%`). The old `@theme` block wrapped them with `hsl()` via the Tailwind mapping, but the new `@theme inline` block does not reference them at all. Any component that tries to use these via Tailwind classes (e.g. `bg-[hsl(var(--color-inbox))]`) will get the wrong value or no value. They are currently unused in TSX files, but they were clearly intended for future use and are now broken.
**Fix:** Either convert them to OKLCH values and register them in `@theme inline`, or wrap them in `hsl()` directly (e.g. `--color-inbox: hsl(217, 91%, 60%)`). Whichever approach, make sure the variables are consumable from Tailwind classes.

### Mobile FAB does not account for bottom tab bar safe-area inset
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:401`
**Problem:** The mobile FAB is positioned with `bottom-20` (80px). The bottom tab bar uses `env(safe-area-inset-bottom)` for padding. On devices with a home indicator (iPhone with notch), the tab bar is taller than 80px total, and the FAB may overlap with or sit behind the tab bar. The `bottom-20` is a fixed value that does not adapt to the safe area.
**Fix:** Use `calc()` with the safe-area inset: `style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}` or add a safe-area-aware utility class. Alternatively, use `bottom-24` as a more conservative fixed value and test on actual iOS devices.

### `formatRelativeDate` returns "0m ago" for just-received emails
**File:** `src/lib/email-display.ts:79`
**Problem:** When `minutes` is 0 (email received less than 60 seconds ago), the function returns `"0m ago"`. This reads awkwardly.
**Fix:** Add a case for `minutes < 1` returning `"just now"` (ideally via an i18n key, not a hardcoded string).

### `formatRelativeDate` uses hardcoded English strings, not i18n
**File:** `src/lib/email-display.ts:79-81`
**Problem:** The relative date strings (`"5m ago"`, `"3h ago"`, `"2d ago"`) are hardcoded in English. The `locale` parameter is only used for the `formatDate` fallback. This breaks the i18n convention.
**Fix:** Accept a translations function or use `Intl.RelativeTimeFormat(locale)` to produce locale-aware relative time strings.

### `getGroupLabel` older-month fallback uses `toLocaleString("default")` instead of the user's locale
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:52`
**Problem:** For emails older than the current month, `getGroupLabel` calls `date.toLocaleString("default", ...)` which uses the browser's default locale rather than the app's configured locale passed as `locale` prop. This could produce month names in a language the user does not expect.
**Fix:** Pass `locale` into `getGroupLabel` and use it: `date.toLocaleString(locale, { month: "long", year: "numeric" })`.

---

## Suggestions

### Search is client-side only, limited to the first 100 emails
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:131-143`
**Note:** The search filters the `emails` array in memory, which is capped at `INBOX_LIMIT = 100` in `page.tsx`. Users with more than 100 inbox emails will not be able to find older messages via search. This is acceptable for now but should be noted as a limitation. A future iteration should add server-side search (e.g. via a Server Action that queries the DB with `ILIKE`).

### Dynamic translation key `t("folders.${id}")` loses type safety
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:217`
**Note:** The dynamic key construction `t(\`folders.${id}\`)` means TypeScript cannot verify the key exists at compile time. This works because the `FOLDERS` array is `as const` and all IDs happen to match keys in `messages/en.json`, but adding or renaming a folder entry could silently break. Consider a lookup object: `const FOLDER_LABELS: Record<typeof FOLDERS[number]["id"], string>` built from `t()` calls.

### `MailboxFilterContent` and `FolderSwitcherContent` are functions-inside-functions
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:163`, `src/app/(app)/inbox/_components/inbox-view.tsx:199`
**Note:** These are defined as nested functions inside `InboxView`, which means they are re-created on every render. React will unmount and remount them every time any state changes. Extract them as separate components that receive the needed props (or use `useCallback` if they must remain closures).

### Clear button in SearchCommand has a small tap target
**File:** `src/app/(app)/inbox/_components/search-command.tsx:69-77`
**Note:** The X (clear) button wraps a 12x12 icon with no explicit minimum size. On mobile this will be difficult to tap. Add `min-h-11 min-w-11 flex items-center justify-center` or at least `p-2` to meet the 44x44px touch target guideline.

### EmailCard has no `role` or `aria-label` for accessibility
**File:** `src/app/(app)/inbox/_components/email-card.tsx:40`
**Note:** The card is interactive (`tabIndex={0}`, `cursor-pointer`) but has no `role="button"` or `role="link"`, and no `aria-label`. Screen readers will announce it as a generic group. Add `role="article"` with an `aria-label` describing the email (sender + subject), or wrap it in a link/button element since clicking it will presumably navigate to the email detail view.

---

## README

Does README.md need updating? No. This is a UI-only change to an existing feature (inbox list). No new env vars, setup steps, or architectural changes.

---

## E2E tests to add

None. The inbox list view is already covered by the existing e2e test infrastructure. The changes are visual/structural and the interactive elements (search, filter, folder switcher) are client-side state that does not create new server-side flows requiring e2e coverage. Unit tests for `formatRelativeDate` would be valuable but are out of scope for e2e.
