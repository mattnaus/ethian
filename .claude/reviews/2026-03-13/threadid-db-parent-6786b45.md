# Review: ThreadId DB-parent resolution — `6786b45`

**Date:** 2026-03-13
**Commits reviewed:** `6786b452`
**Files reviewed:** `src/lib/queue/workers/sync.worker.ts`

---

## Summary

Small, focused change that fixes a real threading bug caused by email clients (Hey) truncating the `References` header. The approach -- look up parent emails in the DB to inherit their `threadId` -- is sound and correctly scoped to `mailAccountId`. Two issues stand out: a missing database index on `message_id` will cause a sequential scan on every processed email, and a race condition when emails in a thread arrive simultaneously across parallel workers.

---

## Critical Issues

None.

---

## Warnings

### Missing index on `emails.message_id` makes the new query slow
**File:** `src/db/schema/emails.ts`
**Problem:** The new `inArray(emails.messageId, parentIds)` query runs for every single incoming email. The `emails` table has no index on `message_id` -- only on `thread_id`. As the table grows this becomes a full sequential scan filtered by `mail_account_id` (also unindexed). At scale this will significantly slow down email processing.
**Fix:** Add a composite index on `(mail_account_id, message_id)` to the schema. This covers both the new parent lookup and the existing duplicate-check query at line 258 which also queries `WHERE mail_account_id = ? AND message_id = ?`.

### Race condition with parallel workers processing thread members simultaneously
**File:** `src/lib/queue/workers/sync.worker.ts:292-305`
**Problem:** The `email-process` worker runs at `concurrency * 2` (line 456). If two emails in the same thread are processed concurrently, the first may not yet be inserted when the second runs its parent lookup. The second email would miss the DB match and fall back to `references[0]`, potentially getting a different `threadId` than the first email will eventually have. This creates split threads -- the exact problem this fix aims to solve.
**Fix:** This is hard to fully eliminate without serialization per thread. A pragmatic mitigation: add a second pass (periodic or on-read) that reconciles `threadId` for emails sharing `inReplyTo`/`references` values. Alternatively, process emails sequentially per `mailAccountId` by using a BullMQ rate limiter or group key, though that reduces throughput.

---

## Suggestions

### Deduplicate `parentIds` before querying
**File:** `src/lib/queue/workers/sync.worker.ts:287-289`
**Note:** `inReplyTo` and `references[0]` are often the same value (RFC 2822 says `In-Reply-To` is typically the last entry in `References`). Deduplicating with `[...new Set(parentIds)]` avoids sending redundant values to `inArray`, though PostgreSQL handles this fine -- it is a minor cleanliness improvement.

### Consider logging when DB parent lookup fails and fallback is used
**File:** `src/lib/queue/workers/sync.worker.ts:305`
**Note:** When `parent` is null and the code falls back to `references[0]`, this is the scenario where threading might still break (parent not yet synced). A `job.log()` call here would help diagnose threading issues in production without adding any runtime cost.

---

## README

Does README.md need updating? No. This is an internal worker logic change with no effect on setup, environment variables, or user-facing behaviour.

---

## E2E tests to add

None. This is background worker logic not reachable from the browser. Threading correctness would be tested via integration tests against the worker function with a test database, not Playwright e2e tests.
