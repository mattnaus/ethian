# Review: Thread/Conversation Grouping — `d0386ce`

**Date:** 2026-03-13
**Commits reviewed:** `d0386ce2`
**Files reviewed:** `src/db/schema/emails.ts`, `drizzle/0001_funny_husk.sql`, `src/app/(app)/inbox/_components/email-card.tsx`, `src/app/(app)/inbox/page.tsx`, `src/app/(app)/inbox/_components/inbox-view.tsx`, `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`, `src/app/(app)/inbox/[emailId]/page.tsx`, `messages/en.json`, `DESIGN.md`

---

## Summary

Solid implementation of thread grouping. The inbox JS grouping logic is clear and correct for the current LIMIT, the null-threadId fallback is handled everywhere, and the detail view conversation layout is well-structured. The main concerns are: (1) a cross-account thread information leak where emails from different mail accounts sharing a threadId are fetched together, (2) missing attachments for the null-threadId single-message fallback, and (3) the "Showing X of Y" footer uses the wrong count after thread collapse.

---

## Critical Issues

### Cross-account thread information leak
**File:** `src/app/(app)/inbox/[emailId]/page.tsx:72`
**Problem:** The thread query filters by `eq(mailAccounts.userId, userId)` but does NOT filter by `eq(emails.mailAccountId, row.mailAccountId)`. If a user has two mail accounts (personal Gmail + work email) and both receive emails in the same thread (same `threadId` / `References` chain), opening the thread from one account will display messages from the other account mixed in. This is likely the intended multi-account behavior based on the user-level sender rules design, but it should be confirmed as intentional. If a user expects accounts to be siloed in the inbox view, this is a leak. The inbox grouping in `page.tsx` (line 56-60) also does not scope threads per-account, so a thread spanning two accounts will collapse into a single row using whichever account's email appeared first.
**Fix:** Confirm with the product owner whether cross-account thread merging is desired. If not, add `eq(emails.mailAccountId, row.mailAccountId)` to the thread query WHERE clause, and group by `(threadId, mailAccountId)` in the inbox page.

---

## Warnings

### Null-threadId fallback loses attachments
**File:** `src/app/(app)/inbox/[emailId]/page.tsx:152-165`
**Problem:** When `threadId` is null, `threadRows` is empty, so `threadEmailIds` is empty, and the attachment query is skipped. The fallback `finalThreadMessages` at line 163 hardcodes `attachments: []`. This means a single email with no threadId will never show its attachments in the detail view, even if it has them.
**Fix:** When `threadRows` is empty (null-threadId case), fetch attachments for `row.id` directly:
```typescript
const fallbackAttachments = row.threadId
  ? []
  : await db
      .select({ ... })
      .from(emailAttachments)
      .where(and(eq(emailAttachments.emailId, row.id), isNull(emailAttachments.contentId)));
```
Then use `fallbackAttachments` in the fallback `finalThreadMessages` entry.

### "Showing X of Y" footer counts are misleading after thread collapse
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:452-456`
**Problem:** The footer says `Showing {emails.length} of {total}` but `total` is the raw email count from the DB (not thread count), while `emails.length` is the collapsed thread count. This produces confusing output like "Showing 15 of 100" when in reality there are 15 threads representing 100 messages. Neither number is wrong per se, but they measure different things.
**Fix:** Either pass a `totalThreads` count from the server (requires a thread-aware count query), or change the footer to say "Showing {shown} threads of {total} messages" with separate i18n keys, or compute total thread count server-side.

### Thread grouping count is understated for large inboxes
**File:** `src/app/(app)/inbox/page.tsx:93` (acknowledged in TODO comment)
**Problem:** The TODO at line 93 notes that `threadCount` may be understated because grouping happens on the LIMIT'd result set (100 rows). If a thread has 5 messages but only 2 fall within the top 100, the badge will show "2" instead of "5". This is a known limitation but worth flagging as a warning since it directly affects user-visible data.
**Fix:** Either: (a) run thread counts as a separate aggregate query (`SELECT thread_id, COUNT(*) ... GROUP BY thread_id`), or (b) accept the approximation and document it. Option (a) is recommended for correctness.

### Migration file bundles unrelated schema change
**File:** `drizzle/0001_funny_husk.sql:1`
**Problem:** The migration adds both `ALTER TABLE "mail_accounts" ADD COLUMN "color"` and `CREATE INDEX "idx_emails_thread_id"`. The color column addition belongs to an earlier feature (account color picker) but was never migrated separately. Bundling unrelated schema changes in one migration makes rollbacks harder.
**Fix:** This is already committed and applied, so no action needed now. For future changes, run `db:generate` after each schema change to keep migrations atomic.

---

## Suggestions

### Thread message sender email hidden on mobile
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:118`
**Note:** The sender's email address in `MessageBlock` has `hidden md:inline`, so on mobile you only see the display name. For senders with no `fromName`, the email address is already shown via the `senderDisplay` fallback (line 102), so this is fine. But for senders with a name, there is no way to see the email address on mobile. Consider adding a tap-to-reveal or showing it on a second line.

### Consider `Promise.all` for parallel queries in detail page
**File:** `src/app/(app)/inbox/[emailId]/page.tsx:57-96`
**Note:** The thread query (line 57-74) and the entry email query (line 27-51) run sequentially. The thread query depends on `row.threadId`, so it cannot be parallelized with the entry query. However, the attachment query (line 79-96) also depends on `threadEmailIds`, so the waterfall is unavoidable. No change needed, just noting the dependency chain is correct.

### `EmailDetail` type is now partially redundant with `ThreadMessage`
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:13-26`
**Note:** `EmailDetail` and `ThreadMessage` share most fields. Consider whether `EmailDetail` can be simplified to just the fields the top bar needs (subject, sentAt, accountName) since the full message data is already in `threadMessages`.

---

## README

Does README.md need updating? No. Thread grouping is an internal implementation detail of the inbox view and does not affect setup, environment variables, or architecture documentation.

---

## E2E tests to add

The thread grouping feature introduces user-visible behavior that should be tested:

1. **Inbox thread collapse** -- verify that multiple emails with the same threadId appear as a single row with a count badge.
2. **Email detail thread rendering** -- verify that opening a threaded email shows all messages in the conversation, oldest first.
3. **Single-message (null threadId) fallback** -- verify that an email with no threadId renders correctly as a single-message view.
