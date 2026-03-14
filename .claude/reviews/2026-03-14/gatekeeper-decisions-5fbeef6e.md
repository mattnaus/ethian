# Review: Gatekeeper approve/block actions — `5fbeef6e`

**Date:** 2026-03-14
**Commits reviewed:** `5fbeef6e`
**Files reviewed:**
- `src/app/(app)/gatekeeper/_actions/decisions.ts`
- `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx`
- `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx`
- `src/app/(app)/gatekeeper/page.tsx`
- `messages/en.json`

---

## Summary

Solid implementation of the Gatekeeper decision flow. The Server Action correctly verifies ownership, upserts sender rules, re-categorises emails, and cleans up the screener queue. The UI uses optimistic removal with `useTransition` appropriately, and the responsive layout handles mobile and desktop well. Two issues stand out: the lack of a database transaction around the three-step mutation (rule insert, email update, queue delete), and the missing error feedback when a decision fails silently on the client side.

---

## Critical Issues

### No database transaction around the multi-step decision mutation
**File:** `src/app/(app)/gatekeeper/_actions/decisions.ts:44-81`
**Problem:** The decision action performs three sequential writes: (1) upsert sender rule, (2) update email categories, (3) delete screener queue entry. If step 2 or 3 fails (e.g. connection drop, constraint violation), the data is left in an inconsistent state -- a sender rule exists but emails are still categorised as `screener`, or the queue entry is not deleted despite emails being re-categorised. This can lead to duplicate rule creation on retry and orphaned screener entries.
**Fix:** Wrap all three operations in `db.transaction(async (tx) => { ... })` and use `tx` for all queries inside.

---

## Warnings

### Failed decisions are silently swallowed on the client
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:30-38`
**Problem:** When `makeGatekeeperDecision` returns `{ success: false }`, the entry is not removed (correct), but no error feedback is shown to the user. The entry simply stops being pending with no indication that something went wrong. The user has no way to know the action failed.
**Fix:** Add a toast notification or inline error state when `result.success` is false, displaying `result.error`.

### Input validation missing on `decision` parameter
**File:** `src/app/(app)/gatekeeper/_actions/decisions.ts:19-21`
**Problem:** The `decision` parameter is typed as `GatekeeperDecision` but Server Actions receive untrusted input over the network. A malicious caller could pass any string value. While `decisionToCategory[decision]` would return `undefined` for an invalid decision (causing an email update with `category: undefined`), this is not a clean failure path.
**Fix:** Add a runtime guard at the top of the function: `if (!["approved", "blocked", "feed", "paper_trail"].includes(decision)) return { success: false, error: "Invalid decision" };`

### Pre-existing build failure (not introduced by this commit)
**File:** `src/lib/queue/index.ts:115`
**Problem:** The build fails due to an ioredis type incompatibility between the top-level `ioredis` package and BullMQ's bundled `ioredis`. This is a pre-existing issue unrelated to this commit but it blocks `npm run build`.
**Fix:** Align ioredis versions (e.g. `npm ls ioredis` to identify the mismatch, then pin a compatible version) or cast the connection with `as any` as a temporary workaround.

---

## Suggestions

### Consider revalidating the Feed and Paper Trail paths
**File:** `src/app/(app)/gatekeeper/_actions/decisions.ts:83-84`
**Note:** The action revalidates `/gatekeeper` and `/inbox`, but decisions for `feed` and `paper_trail` move emails to those categories. If the user navigates to Feed or Paper Trail after approving a sender as Feed, they will see stale data until the next full page load. Add `revalidatePath("/feed")` and `revalidatePath("/paper-trail")` (or revalidate all conditionally based on `decision`).

### `screenerQueueId` should be validated as a UUID
**File:** `src/app/(app)/gatekeeper/_actions/decisions.ts:20`
**Note:** The `screenerQueueId` parameter is passed directly to a Drizzle `eq()` clause. While Drizzle parameterises queries (preventing SQL injection), passing a non-UUID string to a UUID column comparison will cause a Postgres error. A simple UUID format check at the top would give a cleaner error message.

### Row container uses `bg-muted/70` -- verify against DESIGN.md tokens
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:48`
**Note:** The row uses `bg-muted/70` with opacity. DESIGN.md specifies `zinc-900` for cards/panels. Verify this matches the intended design -- `muted` maps to a CSS variable that may differ from `zinc-900` depending on the theme configuration.

---

## README

Does README.md need updating? **No.** This change adds functionality to an existing feature (Gatekeeper) and does not introduce new environment variables, setup steps, or architectural changes.

---

## E2E tests to add

The Gatekeeper approve/block flow is a core user-visible interaction that should have e2e coverage:

1. **Approve a sender** -- verify the entry disappears from the list, a sender rule is created, and emails are re-categorised to inbox.
2. **Block a sender** -- verify the entry disappears, a sender rule is created with `blocked` decision, and emails move to trash.
3. **Feed/Paper Trail via More menu** -- verify the popover opens, selecting Feed creates the correct rule.
4. **Error state** -- verify that if the action fails, the entry remains visible (not optimistically removed permanently).

