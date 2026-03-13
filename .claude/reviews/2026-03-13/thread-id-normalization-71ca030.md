# Review: Thread ID normalization fix — `71ca030`

**Date:** 2026-03-13
**Commits reviewed:** `71ca030`
**Files reviewed:** `src/lib/imap/client.ts`, `src/app/(app)/inbox/[emailId]/_actions/reply.ts`, `src/lib/smtp/client.ts`, `src/lib/queue/workers/sync.worker.ts`

---

## Summary

The change correctly identifies and fixes the root cause of broken threading: inconsistent angle-bracket handling between imapflow's ENVELOPE and mailparser's references array. The `normalizeMessageId()` helper is clean, the regex is correct, and applying it to `envelope.messageId` and `parsed.inReplyTo` achieves consistent bare-format storage. The reply action correctly re-adds brackets for RFC 2822 wire format. However, there is one critical issue: nodemailer returns `info.messageId` with angle brackets, and this value is stored directly in the DB without normalization, breaking the very consistency this commit establishes.

---

## Critical Issues

### Sent email messageId stored with angle brackets
**File:** `src/app/(app)/inbox/[emailId]/_actions/reply.ts:104`
**Problem:** Nodemailer's `sendMail()` returns `info.messageId` wrapped in angle brackets (e.g., `<abc@nodemailer.com>`). This value is stored directly into the `emails` table at line 104 (`messageId: sendResult.messageId`) without stripping brackets. This means sent replies will have bracketed messageIds in the DB while all incoming emails (post-fix) have bare messageIds. If someone later replies to your reply, the threading will break again for the same reason this commit fixes for incoming mail.
**Fix:** Strip angle brackets from `sendResult.messageId` before storing. Either import `normalizeMessageId` from the IMAP client (after exporting it), create a shared utility, or inline the strip:
```typescript
messageId: sendResult.messageId.replace(/^<|>$/g, ""),
```
Apply the same normalization at `src/lib/smtp/client.ts:163` so `SendResult.messageId` is always bare format, keeping the convention in one place.

### Double-bracket risk on legacy data in reply headers
**File:** `src/app/(app)/inbox/[emailId]/_actions/reply.ts:88-89`
**Problem:** The work log notes that existing DB rows still have angle brackets in `messageId`/`threadId`. When replying to a pre-fix email, `row.messageId` will be `<abc@hey.com>`, and line 88 wraps it again: `` `<${row.messageId}>` `` producing `<<abc@hey.com>>`. The same applies to `replyReferences` entries at line 89. This produces malformed RFC 2822 headers that will break threading on the receiving mail server.
**Fix:** Strip brackets before re-adding them, or use a helper that ensures exactly one layer of brackets:
```typescript
function ensureBrackets(id: string): string {
  const bare = id.replace(/^<|>$/g, "");
  return `<${bare}>`;
}
```
Apply to both `inReplyTo` and `references.map()`.

---

## Warnings

### `normalizeMessageId` not exported for reuse
**File:** `src/lib/imap/client.ts:75`
**Problem:** The normalization logic is defined as a private function in the IMAP client. The reply action needs the same logic (see Critical issues above), and any future code that touches message IDs will too. Having it in the IMAP client module is the wrong location for a shared utility.
**Fix:** Move `normalizeMessageId` to a shared location (e.g., `src/lib/email-utils.ts` or export from `src/lib/imap/client.ts`) and reuse it in `reply.ts` and `smtp/client.ts`.

### No migration script for existing data
**File:** N/A
**Problem:** The work log acknowledges that existing DB rows have angle brackets in `messageId`/`threadId` and says "a re-sync or manual UPDATE is needed." Without a migration script or documented SQL command, this will be forgotten. Existing threads will remain broken indefinitely.
**Fix:** Add a SQL migration or a documented one-liner in the work log:
```sql
UPDATE emails SET message_id = TRIM(BOTH '<>' FROM message_id),
                  thread_id = TRIM(BOTH '<>' FROM thread_id),
                  in_reply_to = TRIM(BOTH '<>' FROM in_reply_to)
WHERE message_id LIKE '<%>';
```
Also update `references` (jsonb array) entries if they contain brackets.

---

## Suggestions

### Regex could be slightly more robust
**File:** `src/lib/imap/client.ts:77`
**Note:** The regex `/^<|>$/g` handles the standard case but would not strip a stray `>` at the start or `<` at the end. A stricter approach like `/^<(.+)>$/.exec(id)?.[1] ?? id` only strips when both brackets are present, which is more correct per RFC 2822. The current regex works fine for all real-world message IDs, so this is cosmetic.

---

## README

Does README.md need updating? No. This is an internal data normalization fix with no impact on setup, architecture, env vars, or user-facing behaviour.

---

## E2E tests to add

None. Threading correctness is an internal data consistency concern driven by IMAP server responses that cannot be meaningfully tested via browser E2E. The fix would be validated by integration tests against mock IMAP data, which is outside the current E2E scope.
