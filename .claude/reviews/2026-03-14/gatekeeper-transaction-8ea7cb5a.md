# Review: Gatekeeper decision transaction fix — `8ea7cb5a`

**Date:** 2026-03-14
**Commits reviewed:** `8ea7cb5a`
**Files reviewed:** `src/app/(app)/gatekeeper/_actions/decisions.ts`

---

## Summary

Clean, focused fix that wraps the three sequential DB writes (upsert sender rule, re-categorise emails, delete screener queue entry) in a `db.transaction()` call. All writes correctly use the `tx` handle instead of `db`. The ownership check read remains outside the transaction, which is acceptable since it is a read-only guard. No new issues introduced.

---

## Critical Issues

None.

---

## Warnings

### Transaction does not catch errors or return a meaningful error to the caller
**File:** `src/app/(app)/gatekeeper/_actions/decisions.ts:44`
**Problem:** If the transaction throws (e.g. a unique constraint violation on the sender rule upsert, or a connection failure), the error propagates as an unhandled exception from the Server Action. The caller (`gatekeeper-row.tsx`) uses `useTransition` and would see the transition end, but the user gets no feedback about what went wrong. Next.js Server Actions that throw unhandled errors surface as generic "An error occurred" messages in production, losing diagnostic detail.
**Fix:** Wrap the `db.transaction()` call in a try/catch and return `{ success: false, error: "Failed to save decision" }` (or a more specific message). Log the original error server-side for debugging.

---

## Suggestions

### The ownership read could be inside the transaction for stronger isolation
**File:** `src/app/(app)/gatekeeper/_actions/decisions.ts:29-38`
**Note:** The screener queue entry is read outside the transaction (lines 29-38), then deleted inside it (line 82). In a concurrent scenario where two requests target the same `screenerQueueId`, both could pass the ownership check, then one transaction would delete the entry and the other would silently delete zero rows. This is harmless (idempotent), but moving the read inside the transaction with a `FOR UPDATE` lock would be the more correct approach if strict exactly-once semantics matter in the future.

---

## README

Does README.md need updating? No. This is an internal fix to an existing Server Action with no user-facing, setup, or architectural changes.

---

## E2E tests to add

None. The gatekeeper approve/block flow is not yet covered by e2e tests, but that gap was already identified in the prior review of `5fbeef6` and is not newly introduced by this commit.
