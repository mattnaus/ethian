# Review: Sync wiring fixes — `d1be503`

**Date:** 2026-03-09
**Commits reviewed:** `d1be503`
**Files reviewed:**
- `src/lib/queue/index.ts`
- `src/app/(app)/settings/_actions/accounts.ts`
- `src/lib/queue/workers/sync.worker.ts`

---

## Summary

This commit directly addresses all three Warnings raised in the previous review of `f9c701e`. The `as any` cast is gone, replaced with a clean exported helper. The update action now fires an immediate re-sync, closing the UX gap where credential changes had to wait up to 5 minutes for feedback. The worker's not-found branch now returns a zero-count result instead of throwing, eliminating 3 pointless retry cycles per deleted account. All three changes are correct and well-scoped. The remaining open items from the prior review (the hardcoded `cancelAccountSync` interval, the missing dedupe `jobId` on immediate sync jobs, and the unguarded `inserted.id`) were categorised as Suggestions and are still present, but none of them have become more urgent with this change. One new issue is introduced: the `triggerImmediateSync` helper can enqueue duplicate jobs for the same account if called in rapid succession, and the helper still has no dedupe key — a pattern that was noted as a suggestion in the prior review but is now slightly more exposed because the helper is called from two callsites.

---

## Critical Issues

None.

---

## Warnings

### `triggerImmediateSync` still has no dedupe key — now called from two callsites
**File:** `src/lib/queue/index.ts:188-190`
**Problem:** The prior review noted (as a Suggestion) that the immediate sync job has no `jobId`, so a double-submit of `addMailAccountAction` would enqueue two jobs for the same account. Now that `triggerImmediateSync` is also called from `updateMailAccountAction`, the same double-submit applies to the edit form. More concretely: if a user saves the edit form while a prior immediate sync job is still waiting in the queue (e.g. Redis is slow), a second job will stack behind it. The periodic repeatable job then fires on top. Three sync jobs for one account will be active concurrently. With `concurrency: 5` on the worker this is not catastrophic — idempotency in the process worker handles re-delivered emails — but it wastes IMAP connections and generates noise in BullMQ's job list.
**Fix:** Add a `jobId` in `triggerImmediateSync` so BullMQ deduplicates on the key:
```ts
export async function triggerImmediateSync(mailAccountId: string): Promise<void> {
  await emailSyncQueue.add(
    "sync-account",
    { mailAccountId },
    { jobId: `immediate-sync-${mailAccountId}` }
  );
}
```
A job with a `jobId` that already exists in the `waiting` or `delayed` state will be silently deduplicated by BullMQ.

---

## Suggestions

### `triggerImmediateSync` swallows BullMQ's returned `Job` object
**File:** `src/lib/queue/index.ts:188-190`
**Note:** `emailSyncQueue.add(...)` returns `Promise<Job<...>>`. The helper discards it with `await` and returns `void`. This is fine for current callers, but if any future caller wants the job ID for status polling or logging, the API forces them to call `emailSyncQueue.add` directly again. Consider returning `Promise<Job<SyncAccountJobData, SyncAccountJobResult>>` to keep the helper generally useful. Low priority; no behaviour change needed today.

### The three prior Suggestions from `f9c701e` remain open
**Files:** `src/lib/queue/index.ts:196`, `src/app/(app)/settings/_actions/accounts.ts:144`
**Note:** Three items from the previous review were not addressed in this commit, which is reasonable since they were Suggestions rather than Warnings. They are:
1. `cancelAccountSync` hardcodes the `5 * 60 * 1000` interval instead of using a shared constant — mismatching a non-default `scheduleAccountSync` call would silently fail to cancel.
2. `inserted.id` after `db.insert(...).returning()` is not guarded against `undefined`.
3. The dedupe `jobId` on `triggerImmediateSync` (now promoted to Warning above given the second callsite).
Items 1 and 2 are still Suggestions-level and should be tracked.

---

## README

No update needed. This commit addresses internal implementation quality (type safety, retry behaviour, UX timing). No new environment variables, setup steps, or user-visible architectural changes are introduced.

---

## E2E tests to add

The three tests specified in `.claude/e2e_tests_to_make/email-sync-wiring.md` already cover the flows touched by this commit:

- Test 1 covers immediate sync on account add (unchanged flow, now uses the new helper).
- Test 2 covers no-sync-after-delete (the worker's early-return is the implementation of this guarantee).
- Test 3 covers Redis unavailability.

One additional test is now warranted by the update flow added in this commit:

**New: Immediate re-sync fires after account update**

Scenario: After a user edits a mail account (e.g. rotates the password), a `sync-account` job should appear in the BullMQ queue for that account without waiting for the 5-minute interval, and the worker should process it using the new credentials.

Steps:
1. Add a mail account and let the initial immediate sync complete.
2. Navigate to Settings → Accounts → Edit.
3. Change the password field to a new valid credential.
4. Submit the form.
5. Inspect the BullMQ `email-sync` queue.

Expected outcome:
- A new `sync-account` job with `data.mailAccountId === accountId` appears in the queue within 1 second of form submission.
- The job completes successfully (worker connects using the updated encrypted password from the DB).
- `mail_accounts.lastSyncedAt` is updated to a time after the form submission.
- The account's `syncStatus` returns to `idle`.

This test spec should be appended to `.claude/e2e_tests_to_make/email-sync-wiring.md`.
