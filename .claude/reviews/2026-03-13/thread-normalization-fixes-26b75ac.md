# Review: Thread ID normalization critical fixes — `26b75ac`

**Date:** 2026-03-13
**Commits reviewed:** `26b75ac`
**Files reviewed:** `src/lib/utils.ts`, `src/lib/imap/client.ts`, `src/app/(app)/inbox/[emailId]/_actions/reply.ts`

---

## Summary

This commit correctly addresses both critical issues from the previous review (71ca030). The `normalizeMessageId` function is moved to a shared location (`src/lib/utils.ts`), the regex is upgraded to `<+`/`>+` to handle double brackets from legacy data, and the reply action now normalizes both the outbound SMTP headers and the stored messageId. The changes are minimal and targeted. One warning remains about the SMTP client still returning raw bracketed messageIds, but the call site handles it.

---

## Critical Issues

None.

---

## Warnings

### normalizeMessageId not applied at the SMTP client layer
**File:** `src/lib/smtp/client.ts:163`
**Problem:** `sendEmail()` still returns `info.messageId` with angle brackets from nodemailer. The normalization is done at the call site in `reply.ts:106`. If any future caller of `sendEmail()` forgets to normalize, the inconsistency will resurface. The previous review suggested normalizing inside the SMTP client itself so `SendResult.messageId` is always bare format.
**Fix:** Add `normalizeMessageId` to `smtp/client.ts:163`:
```typescript
messageId: normalizeMessageId(info.messageId) ?? info.messageId,
```
This makes the contract of `sendEmail()` consistent with the rest of the codebase (bare IDs everywhere) and removes the burden from callers.

### No migration for existing bracketed data
**File:** N/A
**Problem:** Carried over from the previous review. Existing DB rows with angle brackets in `messageId`, `threadId`, and `inReplyTo` are still present. The normalize-then-bracket pattern in `reply.ts:90-91` prevents malformed wire headers when replying to legacy rows, which is good. But thread grouping queries that compare `threadId` values will still fail to match old bracketed rows against new bare rows. This means existing conversations will remain visually broken until a data migration or re-sync.
**Fix:** Run a one-time SQL update (as suggested in the previous review) or create a Drizzle migration:
```sql
UPDATE emails SET message_id = TRIM(BOTH '<>' FROM message_id),
                  thread_id = TRIM(BOTH '<>' FROM thread_id),
                  in_reply_to = TRIM(BOTH '<>' FROM in_reply_to)
WHERE message_id LIKE '<%>';
```
Also update `references` (jsonb array) entries if they contain brackets.

---

## Suggestions

### Consider a unit test for normalizeMessageId
**File:** `src/lib/utils.ts:26`
**Note:** `normalizeMessageId` is now a shared utility that the correctness of threading depends on. A small unit test covering the key cases (bare ID passthrough, single brackets, double brackets, null, empty string, whitespace-only) would prevent regressions and document the expected behavior.

---

## README

Does README.md need updating? No. This is an internal refactor of message ID normalization with no impact on setup, architecture, env vars, or user-facing behaviour.

---

## E2E tests to add

None. This is an internal data normalization concern that cannot be meaningfully tested via browser E2E.
