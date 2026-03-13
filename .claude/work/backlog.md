# Ethian — Backlog

Issues not fixed at review time. Each entry links to the review where it was raised.

---

### Hardcoded "New" divider text bypasses i18n
**Source:** `.claude/reviews/2026-03-13/email-detail-v0-rewrite-3cbe007.md`
**Location:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx` line 275
**Detail:** The "New" string is hardcoded in JSX, bypassing the translation system. Add a `newDivider` key under `pages.emailDetail` in `messages/en.json` and use `t("newDivider")`.

---

### "Cmd+Enter to send" hint is Mac-only
**Source:** `.claude/reviews/2026-03-13/email-detail-v0-rewrite-3cbe007.md`
**Location:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx` line 313; `messages/en.json`
**Detail:** The keyboard handler already handles both Cmd and Ctrl, but the hint displays "Cmd+Enter" which is wrong on Windows/Linux. Use platform detection (`navigator.platform` / `navigator.userAgent`) to show "Ctrl+Enter" on non-Mac, or change the hint to a neutral string like "⌘/Ctrl+Enter to send".

---

### "More options" button and paperclip button below 44px touch target
**Source:** `.claude/reviews/2026-03-13/email-detail-v0-rewrite-3cbe007.md`
**Location:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx` lines 247-253
**Detail:** The MoreHorizontal button is `w-9 h-9` (36px) and the paperclip button has no explicit dimensions — both violate the 44px mobile touch target requirement. Change to `min-h-11 min-w-11` or use `p-3` padding.

---

### DESIGN.md Email Detail View section is stale
**Source:** `.claude/reviews/2026-03-13/email-detail-v0-rewrite-3cbe007.md`
**Location:** `DESIGN.md` lines 351–423
**Detail:** Still documents the old MessageBlock layout, h-12 top bar, pl-[2.375rem] indent pattern. Current implementation uses chat bubbles, py-4 header, auto-resize textarea. Update the Email Detail View section to reflect the new design.

---

## Features

### "Gatekept" — sender rule management panel
**Source:** User request (2026-03-13)
**Detail:** Add a sidebar item "Gatekept" that shows all existing sender rules (approved, blocked, feed, paper trail) so the user can review and manage them. This is distinct from the Gatekeeper (which shows *pending* unknown senders) — Gatekept shows *decided* senders. Likely a new route `/gatekept` with a list of `sender_rules` rows grouped or filterable by decision type, with the ability to edit or delete rules.

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
