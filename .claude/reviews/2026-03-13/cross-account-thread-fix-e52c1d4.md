# Review: Cross-account thread leak fix — `e52c1d4`

**Date:** 2026-03-13
**Commits reviewed:** `e52c1d41`
**Files reviewed:** `src/app/(app)/inbox/[emailId]/page.tsx`, `src/app/(app)/inbox/page.tsx`, `.claude/work/backlog.md`

---

## Summary

This is a small, focused security fix that adds `mailAccountId` scoping to thread queries, preventing messages from different mail accounts from leaking into the same thread view. The fix is correct and minimal. The detail-page query now filters on `(threadId, mailAccountId, userId)` which is properly restrictive, and the inbox grouping key uses `${threadId}:${mailAccountId}` to prevent cross-account thread merging. No new issues introduced. The pre-existing null-threadId attachment bug (documented in backlog.md) remains, but that is out of scope for this fix.

---

## Critical Issues

None.

---

## Warnings

### Redundant userId check in thread query after adding mailAccountId
**File:** `src/app/(app)/inbox/[emailId]/page.tsx:72-76`
**Problem:** The thread query now filters on `eq(emails.mailAccountId, row.mailAccountId)` AND `eq(mailAccounts.userId, userId)`. Since `row` was already fetched with a `userId` check (line 48), `row.mailAccountId` is guaranteed to belong to `userId`. The `INNER JOIN mailAccounts` + `userId` check is therefore redundant — the query could join only on `emails` and filter by `(threadId, mailAccountId)` without the join at all. This is not a bug (defense-in-depth is reasonable), but it adds an unnecessary join for every detail page load.
**Fix:** Keep the `userId` check as defense-in-depth. This is a performance nit, not a correctness issue. No action required unless query performance becomes a concern. Marking as Warning for awareness only.

---

## Suggestions

### Add a composite index for the thread query
**File:** `src/db/schema/emails.ts`
**Note:** The thread detail query now filters on `(threadId, mailAccountId)`. There is an index on `threadId` alone (`idx_emails_thread_id`). A composite index on `(thread_id, mail_account_id)` would serve both this query and the inbox grouping pattern more efficiently. Low priority until there is measurable query latency.

### Consider extracting the grouping key function
**File:** `src/app/(app)/inbox/page.tsx:98,113`
**Note:** The expression `entry.threadId ? \`${entry.threadId}:${entry.mailAccountId}\` : entry.id` is duplicated on lines 98 and 113. Extract to a small helper (`threadGroupKey(entry)`) to avoid drift if the key format changes again.

---

## README

Does README.md need updating? No. This is an internal query-scoping fix with no user-facing setup, architecture, or env var changes.

---

## E2E tests to add

None. The cross-account thread leak is a server-side data isolation issue that requires multiple mail accounts with overlapping thread IDs to reproduce. This is better tested with an integration test against the database layer than with a browser-level e2e test.
