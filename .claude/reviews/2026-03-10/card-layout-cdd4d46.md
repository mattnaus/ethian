# Review: Card-based email list layout — `cdd4d46`

**Date:** 2026-03-10
**Commits reviewed:** `cdd4d46`
**Files reviewed:**
- `src/app/(app)/inbox/_components/email-list.tsx`
- `src/app/(app)/inbox/_components/email-row.tsx`
- `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx`
- `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx`
- `src/app/(app)/gatekeeper/page.tsx`
- `src/lib/email-display.ts` (unchanged in this commit, referenced)
- `src/db/schema/senders.ts` (schema context)
- `src/db/schema/emails.ts` (schema context)
- `src/app/(app)/inbox/page.tsx` (unchanged in this commit, context)

---

## Summary

Clean, well-structured refactor that unifies the inbox and gatekeeper list layouts into a consistent card-based design. The responsive split (mobile two-line vs desktop single-line) is well executed with proper `md:hidden` / `hidden md:block` pairs. The gatekeeper query additions (emails JOIN, attachment subquery) are correct and follow the same pattern already established in the inbox page. No security or data loss issues. A few minor concerns around the removed `messageCount` information and row interactivity.

---

## Critical Issues

None.

---

## Warnings

### Gatekeeper lost message count information with no replacement
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx`
**Problem:** The previous gatekeeper row displayed a `messageCount` badge showing how many emails are queued from each unknown sender. This commit removes it entirely. For a screener/gatekeeper decision, knowing whether a sender sent 1 email or 50 is material -- it signals spam vs. legitimate bulk sender. The `screener_queue.messageCount` column still exists in the schema and is still maintained by the sync worker, but the UI no longer surfaces it.
**Fix:** Re-add a message count indicator to the gatekeeper row. It does not need to be a badge -- a subtle `"3 emails"` text next to the sender name or date would suffice.

### Email rows are not keyboard-accessible or interactive
**File:** `src/app/(app)/inbox/_components/email-row.tsx:24-111`
**Problem:** Each card is a plain `<div>` with `cursor-default` and a hover effect, but no `role`, `tabIndex`, `onClick`, or link wrapper. When the email detail view is built, these will need to become interactive. More immediately, screen readers cannot navigate the list item by item, and there is no focus-visible state despite the hover styling.
**Fix:** This is acceptable as a temporary state since the detail view is not built yet, but when it is, wrap each row in a `<Link>` or `<button>` with `role="row"` / `role="listitem"` and ensure keyboard focus styling. Note this applies equally to `gatekeeper-row.tsx`.

---

## Suggestions

### Consider extracting the shared card wrapper classes
**File:** `src/app/(app)/inbox/_components/email-row.tsx:27-29`, `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:33-35`
**Note:** Both row components use the identical class string: `"bg-zinc-900 rounded-lg border border-zinc-800/50"`, `"flex items-center gap-3 px-4 py-3"`, `"hover:bg-zinc-800/60 transition-colors cursor-default"`. If more list views are added (Feed, Paper Trail), extracting this to a shared `EmailCard` wrapper or a constant would reduce duplication.

### Mobile row touch target height may be tight
**File:** `src/app/(app)/inbox/_components/email-row.tsx:28`
**Note:** With `py-3` (12px top + 12px bottom) and the content inside, the total row height is likely around 56-60px on mobile which meets the 44px minimum. However, when these rows become tappable links, verify the actual rendered height on a real device. The `gap-0.5` (2px) between cards is very tight for fat-finger accuracy on adjacent rows.

### Gatekeeper row does not distinguish read/unread state
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:55,69,75`
**Note:** Unlike the inbox row which dims read emails (`font-normal text-zinc-400`), the gatekeeper row always renders with `font-semibold text-zinc-50`. This is arguably correct since all gatekeeper entries are "unread" by nature (pending decision), but worth a conscious design note.

### `screenerQueue.subject` column is now redundant for display
**File:** `src/app/(app)/gatekeeper/page.tsx:42-43`
**Note:** The query now reads `subject` and `snippet` from the joined `emails` table rather than from `screenerQueue.subject`. The `screenerQueue.subject` column (schema line 120) is still populated by the sync worker but no longer read by any UI query. Consider whether it should be kept for other future use or eventually dropped in a migration.

---

## README

Does README.md need updating? **No.** This is a purely visual/layout change with no new setup steps, env vars, or architectural changes.

---

## E2E tests to add

None. The existing list views are placeholder-level (no user interaction beyond viewing). E2E tests for email list interaction should be added when the detail view and click-to-open flow are built.
