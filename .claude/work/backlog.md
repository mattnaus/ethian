# Ethian — Backlog

Issues not fixed at review time. Each entry links to the review where it was raised.

---

### `navigator.platform` is deprecated
**Source:** `.claude/reviews/2026-03-13/email-detail-warnings-5e30006.md`
**Location:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx` — `isMac` detection
**Detail:** `navigator.platform` is deprecated. Works today and the Mac-only failure mode is harmless (shows "Ctrl+Enter" on Mac). Replace with `navigator.userAgentData?.platform` with a fallback to `navigator.platform` for Safari.

---

## Features

### "Gatekept" — sender rule management panel
**Source:** User request (2026-03-13)
**Detail:** Add a sidebar item "Gatekept" that shows all existing sender rules (approved, blocked, feed, paper trail) so the user can review and manage them. This is distinct from the Gatekeeper (which shows *pending* unknown senders) — Gatekept shows *decided* senders. Likely a new route `/gatekept` with a list of `sender_rules` rows grouped or filterable by decision type, with the ability to edit or delete rules.

---

### Race condition in thread grouping under parallel workers
**Source:** `.claude/reviews/2026-03-13/threadid-db-parent-6786b45.md`
**Location:** `src/lib/queue/workers/sync.worker.ts` — process-email worker
**Detail:** The process worker runs at `concurrency * 2`. If two emails from the same thread are processed simultaneously, the second may not find the first in the DB yet and fall back to `references[0]`, producing a wrong `threadId`. Mitigations: a post-insert reconciliation pass that re-resolves `threadId` for newly inserted emails whose parent lands after them, or serialising processing per `mailAccountId`.

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

### Composite index on (thread_id, mail_account_id)
**Source:** `.claude/reviews/2026-03-13/cross-account-thread-fix-e52c1d4.md`
**Location:** `src/db/schema/emails.ts`
**Detail:** The thread detail query now filters by both `thread_id` and `mail_account_id`. The existing index covers only `thread_id`. A composite index on `(thread_id, mail_account_id)` would better serve this query pattern.

---

### Duplicated grouping key expression in inbox page
**Source:** `.claude/reviews/2026-03-13/cross-account-thread-fix-e52c1d4.md`
**Location:** `src/app/(app)/inbox/page.tsx` — lines 98 and 113
**Detail:** The expression `` entry.threadId ? `${entry.threadId}:${entry.mailAccountId}` : entry.id `` is duplicated in Pass 2 and Pass 3. Extract to a local helper `function threadKey(entry)` to prevent future drift.

---

### Thread count badge understated for large inboxes
**Source:** `.claude/reviews/2026-03-13/thread-grouping-d0386ce.md`
**Location:** `src/app/(app)/inbox/page.tsx` — Pass 2 grouping, marked with `// TODO`
**Detail:** JS grouping runs on the top-100 fetched rows. If a thread has messages beyond position 100, `threadCount` will be understated. Fix: replace JS grouping with a SQL `GROUP BY thread_id, mail_account_id` query that counts all messages per thread accurately.

---

### Gatekeeper approve/block buttons lack minimum touch targets on mobile
**Source:** `.claude/reviews/2026-03-14/gatekeeper-rebuild-c5923fd.md`
**Location:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx` — Approve and Block buttons
**Detail:** The buttons have `px-5` but no `min-h-11 min-w-11`. On mobile, when card content is short, buttons could fall below the 44×44px minimum touch target required by the design system. Add `min-h-11` (and `min-w-11` if needed) to guarantee a valid touch target.

---

### GatekeeperEmail / GatekeeperCard duplicates InboxEmail / EmailCard
**Source:** `.claude/reviews/2026-03-14/gatekeeper-rebuild-c5923fd.md`
**Location:** `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx`
**Detail:** `GatekeeperEmail` is structurally identical to `InboxEmail` and `GatekeeperCard` is a near-copy of `EmailCard` (only difference: `<div>` instead of `<Link>` + `flex-1 min-w-0`). Future changes to one will silently diverge from the other. Fix: extract a shared `EmailCardBase` component and a single `EmailShape` type to a shared location, then compose `EmailCard` and `GatekeeperCard` from it.
