# Review: Rebuild Gatekeeper from Inbox base — `c5923fd`

**Date:** 2026-03-14
**Commits reviewed:** `c5923fd8`
**Files reviewed:**
- `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx` (new)
- `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx` (rewritten)
- `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx` (deleted)
- `src/app/(app)/gatekeeper/page.tsx`
- `src/app/(app)/gatekeeper/_actions/decisions.ts` (unchanged, reviewed for context)
- `src/app/(app)/inbox/_components/email-card.tsx` (unchanged, reviewed for comparison)

---

## Summary

Clean copy-and-adapt from the inbox components. The build passes, i18n keys are correctly used via `useTranslations`, the decision Server Action is properly auth-guarded and transactional, and the optimistic removal pattern with `useTransition` is solid. The main concerns are: failed decisions are silently swallowed with no user feedback, the Approve/Block buttons are too narrow for reliable touch on mobile, and there is meaningful code duplication between `GatekeeperCard` and `EmailCard` that will become a maintenance burden.

---

## Critical Issues

None.

---

## Warnings

### No error feedback when a gatekeeper decision fails
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:190-203`
**Problem:** `handleDecision` calls `makeGatekeeperDecision` and checks `result.success`, but on failure the entry is simply left in the list with `pendingIds` cleared. The user gets no toast, alert, or visual indication that the action failed. If the server returns `{ success: false, error: "Not found" }` (e.g. a race condition where another tab already approved the sender), the user will keep tapping Approve with no effect.
**Fix:** Add a toast notification (shadcn/ui `sonner` or similar) on failure showing `result.error`. At minimum, `console.error` the failure so it is not entirely invisible during development.

### Approve/Block buttons lack minimum touch target on mobile
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:324-335`
**Problem:** The buttons use `px-5` for horizontal padding but have no explicit vertical padding or minimum height. On mobile, the button height is determined solely by `items-stretch` matching the card height, which should be tall enough in practice. However, the horizontal width of these buttons on narrow mobile screens (where the card already takes `flex-1`) may compress them below the 44px minimum width required by the design system. Additionally, `items-stretch` on the flex row means on very short cards (short subject, no snippet) the buttons could be shorter than 44px.
**Fix:** Add `min-h-11 min-w-11` to both buttons to guarantee the 44x44px touch target regardless of card content height, per the CLAUDE.md responsiveness rules.

### Duplicated GatekeeperEmail type mirrors InboxEmail exactly
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx:12-26`
**Problem:** `GatekeeperEmail` is an identical copy of `InboxEmail` from `email-card.tsx`. If a field is added to `InboxEmail` (e.g. `starred`, `labels`), `GatekeeperEmail` will silently fall out of sync. The card component itself is also a near-exact copy of `EmailCard` with only two changes (`<div>` vs `<Link>`, `flex-1 min-w-0`).
**Fix:** Extract a shared `BaseEmailCard` component (or at least a shared type) into `src/app/(app)/_components/` that both inbox and gatekeeper import. The gatekeeper variant can wrap it in a `<div>` and pass `flex-1 min-w-0` via a `className` prop. This was an explicit copy-paste per the request, so this is a warning for future cleanup rather than a blocker.

---

## Suggestions

### `getGroupLabel` returns raw `toLocaleString` for older dates, bypassing i18n
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:39`
**Note:** For dates older than the current month, `getGroupLabel` returns `date.toLocaleString("default", { month: "long", year: "numeric" })` which uses the browser's default locale rather than the app's configured locale. Pass `locale` into `getGroupLabel` and `groupEmails` so the month name matches the user's language setting. This is the same issue in the inbox code, so both should be fixed together.

### `GatekeeperCard` has a `hover:` style missing that `EmailCard` has
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx:48-56`
**Note:** `EmailCard` includes `hover:border-primary/50` and `cursor-pointer` which were removed from `GatekeeperCard` (correctly, since it is not clickable). However, the card still has `transition-all` with nothing to transition. Remove `transition-all` or replace with `transition-colors` to avoid unnecessary GPU compositing.

### `total` prop uses `emails.length` from initial server data, not reactive `entries` state
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:344`
**Note:** The "Showing X of Y" footer compares `emails.length` (initial prop) with `total` (initial prop). After approving/blocking entries, `entries` state shrinks but the footer still shows the original counts. This footer is minor (only shown when `total > emails.length`), but for consistency the shown count should reflect `filtered.length` or `entries.length` post-decisions.

---

## README

Does README.md need updating? No. This change modifies the Gatekeeper UI implementation but does not affect setup, environment variables, architecture, or user-facing documentation.

---

## E2E tests to add

The Gatekeeper approve/block flow is a user-visible interaction that modifies database state (creates sender rules, re-categorizes emails, removes screener entries). It should have e2e coverage:

1. **Gatekeeper approve flow** — verify that clicking Approve removes the entry from the list, creates a sender rule, and moves the email to inbox.
2. **Gatekeeper block flow** — verify that clicking Block removes the entry from the list, creates a blocked sender rule, and moves the email to trash.
3. **Gatekeeper empty state** — verify the empty state message displays when no screener entries exist.
