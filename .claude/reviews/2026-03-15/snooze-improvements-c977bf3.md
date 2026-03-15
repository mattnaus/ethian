# Review: Snooze improvements — `c977bf3`

**Date:** 2026-03-15
**Commits reviewed:** `86ea314`, `048d93c`, `38b7682`, `7146b1f`, `c977bf3`
**Files reviewed:**
- `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`
- `src/app/(app)/_components/section-list-view.tsx`
- `src/app/(app)/_components/read-only-email-view.tsx`
- `src/app/(app)/snoozed/_components/snoozed-card.tsx`
- `src/app/(app)/_actions/snooze-email.ts`
- `messages/en.json`

---

## Summary

Five incremental commits that add snooze functionality to the inbox detail view, improve tooltip accessibility, show the wake-up time in confirmation toasts, fix snoozed card layout overflow, and implement thread-level snooze/unsnooze. The build passes cleanly with no TypeScript errors. Authorization is correctly handled — thread-level snooze scopes updates by `mailAccountId` which is verified as user-owned before the update. Error handling follows the reference pattern. The code is solid overall; the main concerns are a mobile accessibility gap and code duplication.

---

## Critical Issues

None.

---

## Warnings

### Snooze button hidden on mobile in inbox detail view
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:348`
**Problem:** The `InboxSnoozeMenu` button uses `hidden md:flex`, making it completely invisible on mobile. The `InboxMoveToMenu` button has the same `hidden md:flex` class (line 418). Mobile users have no way to snooze or move emails from the inbox conversation view. The `SnoozeMenu` and `MoveToMenu` in `read-only-email-view.tsx` do NOT have this restriction — they use plain `flex` and are visible on all screen sizes. This inconsistency means snooze works on mobile in feed/saved detail views but not in the inbox detail view.
**Fix:** Remove `hidden md:` from both buttons in `email-detail-view.tsx` so they use `flex` like their counterparts in `read-only-email-view.tsx`. Ensure touch targets meet the 44x44px minimum (they already have `h-9` + `py-2` which is close but may need `min-h-11`).

### Duplicated `getSnoozePresets` and `formatSnoozeDate` functions
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:282-317` and `src/app/(app)/_components/read-only-email-view.tsx:164-182`
**Problem:** `getSnoozePresets()` and `formatSnoozeDate()` are copy-pasted identically in two files. If snooze presets are updated in one place, the other will be missed.
**Fix:** Extract both functions into a shared module (e.g. `src/lib/snooze-utils.ts`) and import from both components.

### `useMemo` for snooze presets captures stale dates
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:307` and `src/app/(app)/_components/read-only-email-view.tsx:225`
**Problem:** `useMemo(() => getSnoozePresets(), [])` computes dates once when the component mounts. If the user keeps the page open across a day boundary (or even for several hours), "Later today" could resolve to a time in the past, and "Tomorrow morning" would be today's morning. The server action validates that the date is in the future and will reject it, but the user gets an unhelpful "Failed to snooze" error with no indication why.
**Fix:** Either recompute presets when the popover opens (move the call into the `onOpenChange` handler or remove the `useMemo` entirely — `getSnoozePresets()` is trivially cheap), or show a more descriptive error when the server rejects a past date.

---

## Suggestions

### Unsafe type assertion for translation keys
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:365` and `src/app/(app)/_components/read-only-email-view.tsx:254`
**Note:** `t(labelKey as "laterToday")` casts away type safety. If a preset key is added or renamed, TypeScript will not catch the mismatch. Define the preset type more precisely:
```ts
type SnoozePresetKey = "laterToday" | "tomorrowMorning" | "nextWeek";
```
and use it in the presets array so `t(labelKey)` is type-safe without the cast.

### `pickDateTime` i18n key defined but unused
**File:** `messages/en.json:255`
**Note:** The key `"pickDateTime": "Pick date & time"` exists in the snooze namespace but is not referenced anywhere in the codebase. Either remove it or note it as reserved for a future custom date picker.

---

## README

Does README.md need updating? No. These changes are incremental UI improvements to existing snooze functionality and do not affect setup, env vars, or architecture.

---

## E2E tests to add

None. Snooze functionality involves server actions that require a seeded database with emails and mail accounts. The existing e2e test infrastructure does not cover email-level interactions, and these incremental improvements do not introduce new user flows beyond what was already introduced in the snooze/trash feature (`68a617a`), which should have its own e2e spec when that infrastructure is built out.
