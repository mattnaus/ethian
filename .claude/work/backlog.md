# Ethian — Backlog

Issues not fixed at review time. Each entry links to the review where it was raised.

---

## Warnings

### Null-threadId fallback loses attachments
**Source:** `.claude/reviews/2026-03-13/thread-grouping-d0386ce.md`
**Location:** `src/app/(app)/inbox/[emailId]/page.tsx` — null-threadId fallback block
**Detail:** When `threadId` is null, the thread query is skipped and the fallback hardcodes `attachments: []`. Single emails without a `threadId` will never show their attachments in the detail view. Fix: either run the single-email attachment query when `threadRows` is empty, or always populate attachments from the existing `attachmentRows` result.

---

### "Showing X of Y" footer mixes thread count and message count
**Source:** `.claude/reviews/2026-03-13/thread-grouping-d0386ce.md`
**Location:** `src/app/(app)/inbox/_components/inbox-view.tsx` — showingOf footer
**Detail:** After JS thread grouping, `emails.length` (the prop) is the collapsed thread count, but `total` (from the server `COUNT(*)`) is the raw message count. The footer says e.g. "Showing 12 threads of 38 emails" which mixes units. Options: hide the footer entirely when grouping is active, or change the server query to count distinct thread groups.

---

### Thread count badge understated for large inboxes
**Source:** `.claude/reviews/2026-03-13/thread-grouping-d0386ce.md`
**Location:** `src/app/(app)/inbox/page.tsx` — Pass 2 grouping, marked with `// TODO`
**Detail:** JS grouping runs on the top-100 fetched rows. If a thread has messages beyond position 100, `threadCount` will be understated. Fix: replace JS grouping with a SQL `GROUP BY thread_id, mail_account_id` query that counts all messages per thread accurately.
