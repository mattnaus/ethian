# Review: Email sync wiring — `f9c701e`

**Date:** 2026-03-09
**Commits reviewed:** `f9c701e`
**Files reviewed:**
- `src/app/(app)/settings/_actions/accounts.ts`
- `src/lib/queue/index.ts`
- `src/lib/queue/workers/sync.worker.ts`

---

## Summary

The change correctly wires account creation and deletion to BullMQ: on add, a repeatable periodic job is registered and an immediate one-time sync is enqueued; on delete, the repeatable job is cancelled first. The intent is sound and the non-fatal `.catch()` wrappers are the right call for Redis availability. However, there are three meaningful problems: a TypeScript type suppression that hides a real API mismatch, a race condition on delete where in-flight jobs can run against a deleted account row, and a missing queue operation in `updateMailAccountAction` when credentials change. None are show-stoppers today, but the type suppression and the update gap should be addressed before the feature is considered complete.

---

## Critical Issues

None.

---

## Warnings

### `emailSyncQueue.add` cast to `any` hides a type mismatch
**File:** `src/app/(app)/settings/_actions/accounts.ts:151`
**Problem:** The call is `(emailSyncQueue.add as any)("sync-account", { mailAccountId: inserted.id })`. The eslint suppression comment above confirms this is a deliberate dodge. The typed signature of `Queue<SyncAccountJobData, SyncAccountJobResult>.add` accepts `SyncAccountJobData` as the second argument, and `{ mailAccountId: inserted.id }` satisfies that type without any cast — `SyncAccountJobData` has `mailAccountId: string` as its only required field. The `as any` is unnecessary and turns off type checking for the entire call expression, including the job name and any future option additions. Remove the cast and the eslint-disable comment; the call typechecks without them.
**Fix:**
```ts
await emailSyncQueue
  .add("sync-account", { mailAccountId: inserted.id })
  .catch((err: unknown) =>
    console.error("[addMailAccount] Failed to enqueue immediate sync for", fields.email, err)
  );
```

### `updateMailAccountAction` does not reschedule the sync job
**File:** `src/app/(app)/settings/_actions/accounts.ts:163–243`
**Problem:** When a user updates an account — particularly when they rotate credentials — `updateMailAccountAction` saves the new encrypted password to the DB but does not cancel and recreate the repeatable BullMQ job. The repeatable job continues to run against the same `mailAccountId`, so the next periodic sync will pick up the updated credentials from the DB correctly. However, if the user changes the IMAP host or port, the sync will use the new values too. This is actually fine from a data perspective since the worker always re-fetches the account row from the DB. The real gap is that there is no immediate re-sync triggered on update. After rotating credentials or fixing a misconfigured host, the user will wait up to 5 minutes before the next scheduled sync fires to confirm the change works. This is a UX regression compared to the add-account flow, which gives instant feedback via the immediate sync job. Enqueue a one-time `sync-account` job after a successful update.
**Fix:** After the `db.update(...)` call and before `revalidatePath`, add:
```ts
await emailSyncQueue
  .add("sync-account", { mailAccountId: accountId })
  .catch((err: unknown) =>
    console.error("[updateMailAccount] Failed to enqueue immediate sync for", fields.email, err)
  );
```

### In-flight sync jobs can run after account deletion
**File:** `src/app/(app)/settings/_actions/accounts.ts:255–261`
**Problem:** `cancelAccountSync` removes the repeatable job template, but any jobs that are already in the queue in the `waiting` or `active` state at deletion time will still execute. The worker at `sync.worker.ts:143` handles a missing account row with `throw new Error(...)`, which causes BullMQ to retry the job up to 3 times with exponential backoff (5 s, 10 s, 20 s). Those retries will all fail and produce 3 noise entries in the failed jobs list. This is not data-corrupting — the worker never writes to the `emails` table if the account row is gone — but it generates unnecessary load and log noise, and leaves ghost jobs in the failed queue for 7 days.
**Fix:** The cleanest mitigation is to drain any waiting/delayed jobs for this account before deleting the row. BullMQ does not have a first-class "remove jobs matching a filter" API, but `emailSyncQueue.obliterate({ force: true })` is too broad. A targeted approach: after `cancelAccountSync`, call `emailSyncQueue.getJobs(["waiting", "delayed"])` and remove any whose `data.mailAccountId === accountId`. Alternatively, add a guard in the worker:
```ts
if (!account) {
  // Account was deleted; discard job without retry
  return { mailAccountId, emailsQueued: 0, errors: 0, syncedAt: new Date().toISOString() };
}
```
This is the lower-effort fix that removes the 3-retry cycle on deletion. The worker change would require modifying `sync.worker.ts` — mark it as a follow-up if the queue-drain approach is preferred.

---

## Suggestions

### `scheduleAccountSync` uses a hardcoded interval in `cancelAccountSync`
**File:** `src/lib/queue/index.ts:187–191`
**Note:** `scheduleAccountSync` accepts an `intervalMs` parameter (defaulting to 5 minutes), but `cancelAccountSync` hardcodes `every: 5 * 60 * 1000`. If `scheduleAccountSync` is ever called with a non-default interval, `cancelAccountSync` will fail to find and remove the repeatable entry because BullMQ keys repeatables by their options. Extract the interval to a shared constant:
```ts
export const SYNC_INTERVAL_MS = 5 * 60 * 1000;
```
and use it in both functions.

### Immediate sync job does not pass a dedupe key
**File:** `src/app/(app)/settings/_actions/accounts.ts:151`
**Note:** The one-time immediate sync job has no `jobId`. If the user somehow triggers `addMailAccountAction` twice in quick succession (double-submit), two immediate sync jobs will be enqueued for the same account. Adding `jobId: \`immediate-sync-${inserted.id}\`` would deduplicate them in Redis.

### `inserted.id` is not null-checked after `returning()`
**File:** `src/app/(app)/settings/_actions/accounts.ts:144`
**Note:** `const [inserted] = await db.insert(...).returning(...)` will be `undefined` if the DB insert silently returns zero rows (edge case with some Postgres configs or if the driver misbehaves). Accessing `inserted.id` would throw an unhandled runtime error that bubbles out of the Server Action as an unhandled exception rather than a clean `{ error: "..." }` response. A guard `if (!inserted) return { error: "Failed to save account." };` would keep the error surface consistent.

---

## README

No update needed. The README already documents that accounts are synced every 5 minutes via repeatable BullMQ jobs (lines 70–71) and that the worker process must be running. The new behaviour (sync triggered immediately on account add, repeatable job cancelled on delete) is an implementation detail that does not affect the setup steps or user-visible documentation.

---

## E2E tests to add

Two new user-visible flows were introduced that should have e2e coverage:

1. **Immediate sync on account add** — after adding a valid mail account, emails should appear in the inbox without waiting for the 5-minute interval. This is currently untestable end-to-end without a real IMAP server, but should be covered with an integration test using a test IMAP fixture.
2. **Repeatable job cancelled on account delete** — after deleting an account, no further sync jobs should fire for that account. Verifiable by inspecting the BullMQ repeatable job list.

Creating spec file now.
