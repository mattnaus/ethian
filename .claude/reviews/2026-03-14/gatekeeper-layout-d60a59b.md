# Review: Align Gatekeeper layout with inbox — `d60a59b`

**Date:** 2026-03-14
**Commits reviewed:** `d60a59b8`
**Files reviewed:**
- `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx`
- `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx`
- `src/app/(app)/gatekeeper/page.tsx`

---

## Summary

Clean implementation that successfully mirrors the inbox's mailbox filter and date-grouping patterns into the Gatekeeper view. The `md:contents` trick for button layout is a smart approach. The build passes without errors. Two issues stand out: hardcoded button labels ("Approve" / "Block") violate the i18n convention despite translation keys already existing in `messages/en.json`, and a failed server action silently leaves the entry in a "pending removed" state with no user feedback.

---

## Critical Issues

None.

---

## Warnings

### Hardcoded "Approve" and "Block" button labels
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:121,132`
**Problem:** The button text "Approve" and "Block" are hardcoded English strings. The translation keys `pages.gatekeeper.approve` and `pages.gatekeeper.block` already exist in `messages/en.json`. This violates the i18n convention from CLAUDE.md: "No hardcoded UI strings in components."
**Fix:** Accept a translations prop or use `useTranslations("pages.gatekeeper")` in the component. Replace `<span>Approve</span>` with `<span>{t("approve")}</span>` and `<span>Block</span>` with `<span>{t("block")}</span>`.

### No user feedback on failed decision
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:190-202`
**Problem:** When `makeGatekeeperDecision` returns `{ success: false }`, the entry is not removed from the list (correct), but the `pendingIds` set is cleaned up and the entry returns to its normal visual state with no indication that the action failed. The user has no way to know the decision was not saved. Additionally, if the server action throws (network error), the promise rejection is unhandled inside `startTransition`.
**Fix:** Add a try/catch around the `makeGatekeeperDecision` call. On failure (either `success: false` or caught exception), show a toast or inline error state so the user knows the action did not complete. This is the same pattern gap that exists in `accounts-list.tsx` but is more impactful here because the user expects the entry to disappear.

### Desktop buttons lose minimum height
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:118,129`
**Problem:** `min-h-[44px] md:min-h-0` sets mobile touch targets correctly at 44px but removes the minimum height on desktop entirely. Since the buttons rely on `items-stretch` from the parent to get their height, they will match the card height — which is fine when the card has content. However, if the card somehow collapses (e.g., empty subject and no snippet), the buttons could become very small tap targets on desktop touchscreens. More importantly, `min-h-0` is unusual and might confuse future developers.
**Fix:** Remove `md:min-h-0` (the default `min-height` is already `auto`/`0` in most browsers, so it is redundant). Or replace with an explicit `md:min-h-10` to ensure a reasonable minimum on desktop.

---

## Suggestions

### Duplicated date-grouping and filter logic
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:29-56,62-72,86-126`
**Note:** The `getGroupLabel`, `groupEntries`, `GroupDivider`, and `MailboxFilterContent` components are copied verbatim from the inbox view. Extract these into shared utilities (e.g., `src/app/(app)/_components/date-groups.tsx` and `src/app/(app)/_components/mailbox-filter.tsx`) to avoid the duplication drifting apart over time.

### `allSelected` shortcut is fragile
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:159,170-174`
**Note:** `allSelected` is computed as `activeAccounts.size === accounts.length`. This works because `activeAccounts` is initialized from `accounts` and only toggled with valid IDs. However, it would be more robust (and clearer in intent) to check `accounts.every(a => activeAccounts.has(a.id))` or simply skip the shortcut and always filter.

---

## README

Does README.md need updating? No. This is a UI layout change to an existing page with no new env vars, setup steps, or architectural changes.

---

## E2E tests to add

None. The Gatekeeper approve/block flow is not yet covered by e2e tests, but that predates this commit. The existing gap should be addressed when the full Gatekeeper approve/block UI feature is complete (per the "Next logical steps" in CLAUDE.md).
