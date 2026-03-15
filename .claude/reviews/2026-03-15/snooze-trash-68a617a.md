# Review: Snooze & Trash views — `68a617a`

**Date:** 2026-03-15
**Commits reviewed:** `68a617ab`
**Files reviewed:**
- `src/db/schema/emails.ts`
- `drizzle/0005_nostalgic_green_goblin.sql`
- `src/app/(app)/_actions/snooze-email.ts`
- `src/app/(app)/_components/read-only-email-view.tsx`
- `src/app/(app)/_components/mobile-nav-context.tsx`
- `src/app/(app)/inbox/page.tsx`
- `src/app/(app)/feed/page.tsx`
- `src/app/(app)/saved/page.tsx`
- `src/app/(app)/snoozed/page.tsx`
- `src/app/(app)/snoozed/_components/snoozed-view.tsx`
- `src/app/(app)/snoozed/_components/snoozed-card.tsx`
- `src/app/(app)/trash/page.tsx`
- `src/app/(app)/trash/_components/trash-view.tsx`
- `src/app/(app)/trash/_components/trash-card.tsx`
- `src/app/(app)/trash/[emailId]/page.tsx`
- `src/lib/queue/workers/sync.worker.ts`
- `messages/en.json`

---

## Summary

Solid implementation overall. The snooze/unsnooze server actions have proper ownership validation and error handling. The trash view correctly reuses the existing `SectionListView` shared component and `moveEmailAction` for restore. The un-snooze worker in `sync.worker.ts` is cleanly integrated with proper shutdown handling. The build passes cleanly. Main concerns are: the `snoozeEmailAction` does not validate that the `until` date is in the future, the `SnoozedView` duplicates the full `SectionListView` boilerplate instead of reusing the shared component, and the `handleUnsnooze` in `SnoozedCard` is missing `finally` to clear pending state per the project error handling convention.

---

## Critical Issues

### Snooze date not validated — past dates accepted
**File:** `src/app/(app)/_actions/snooze-email.ts:39`
**Problem:** `snoozeEmailAction` accepts any ISO 8601 string as the `until` parameter and passes it directly to `new Date(until)`. An invalid date string (e.g. `"not-a-date"`) produces `Invalid Date` which Drizzle will attempt to insert, causing a silent DB error caught by the generic catch block. More importantly, a past date is accepted, which means the un-snooze worker will immediately clear it on the next 60s tick, making the snooze appear to do nothing. There is also no validation that `until` is a reasonable future date (e.g. not 100 years from now).
**Fix:** Validate the parsed date before the DB update:
```ts
const parsedUntil = new Date(until);
if (isNaN(parsedUntil.getTime())) {
  return { success: false, error: "Invalid date" };
}
if (parsedUntil <= new Date()) {
  return { success: false, error: "Snooze time must be in the future" };
}
```

---

## Warnings

### SnoozedCard handleUnsnooze missing `finally` block
**File:** `src/app/(app)/snoozed/_components/snoozed-card.tsx:70-81`
**Problem:** The `handleUnsnooze` function uses `startTransition` with `try/catch` but has no `finally` block. Per the project convention (CLAUDE.md, reference: `gatekeeper-list.tsx` `handleDecision()`), all Server Action calls in client components must use `try/catch/finally` to always clear pending state. While `useTransition` manages `isPending` automatically and the `onUnsnoozed` callback removes the card from the list, the convention exists to prevent UI from getting stuck if the action throws in an unexpected way. The `useTransition` hook does handle this correctly in practice, but the codebase convention should be followed consistently.
**Fix:** Not strictly a bug since `useTransition` manages `isPending` internally, but for convention consistency, add a `finally` block (even if empty or with a comment explaining `useTransition` handles cleanup).

### SnoozeMenu handleSnooze missing `finally` block
**File:** `src/app/(app)/_components/read-only-email-view.tsx:193-208`
**Problem:** Same issue as above — `handleSnooze` uses `try/catch` inside `startTransition` but no `finally`. Convention requires `finally` to always clear pending state.
**Fix:** Same as above.

### MoveToMenu handleMove missing `finally` block
**File:** `src/app/(app)/_components/read-only-email-view.tsx:83-103`
**Problem:** Same pattern — `handleMove` in `MoveToMenu` uses `try/catch` inside `startTransition` but no `finally`.
**Fix:** Same as above.

### SnoozedView duplicates SectionListView boilerplate
**File:** `src/app/(app)/snoozed/_components/snoozed-view.tsx`
**Problem:** The `SnoozedView` component (271 lines) manually implements the full mailbox filter, search, desktop/mobile top bars, list container, empty state, and footer — the exact same boilerplate that was extracted into `SectionListView` in the previous commit (`66831f1`). The `TrashView` correctly uses `SectionListView` (67 lines). The `SnoozedView` should do the same.
**Fix:** Refactor `SnoozedView` to use `SectionListView<SnoozedEmail>` with a custom `renderCard` and `searchFilter`, matching the `TrashView` pattern. This would reduce it from ~270 lines to ~70 lines.

### Un-snooze checker result length check is unreliable
**File:** `src/lib/queue/workers/sync.worker.ts:502`
**Problem:** The code checks `if (Array.isArray(result) && result.length > 0)` to determine if rows were updated. Drizzle's `.update().set().where()` returns different shapes depending on the driver. With `drizzle-orm/node-postgres`, it returns `QueryResult` which has a `rowCount` property, not an array with length. The check will likely never log the "Cleared N expired snooze(s)" message even when rows are updated.
**Fix:** Use `.returning()` to get actual results, or check `result.rowCount`:
```ts
const result = await db
  .update(emails)
  .set({ snoozedUntil: null })
  .where(...)
  .returning({ id: emails.id });

if (result.length > 0) {
  console.log(`[unsnooze] Cleared ${result.length} expired snooze(s)`);
}
```

### Trash detail page does not verify email is in trash category
**File:** `src/app/(app)/trash/[emailId]/page.tsx:43-49`
**Problem:** The query filters by `emails.id` and `mailAccounts.userId` but does not check `eq(emails.category, "trash")`. A user could access any email via `/trash/[id]` regardless of its category, which is confusing (not a security issue since ownership is checked). Other section detail pages (feed, saved) similarly don't filter by category, so this is at least consistent, but for trash specifically it is odd to view a non-trashed email at a `/trash/` URL.
**Fix:** Add `eq(emails.category, "trash")` to the WHERE clause.

---

## Suggestions

### Missing database index on snoozedUntil for un-snooze worker
**File:** `src/db/schema/emails.ts:99`
**Problem:** The un-snooze worker runs `WHERE snoozed_until IS NOT NULL AND snoozed_until <= NOW()` every 60 seconds across all emails. Without an index on `snoozed_until`, this is a sequential scan. At small scale this is fine, but adding a partial index now would be cheap and future-proof.
**Note:** Consider adding: `index("idx_emails_snoozed_until").on(t.snoozedUntil).where(sql\`snoozed_until IS NOT NULL\`)` to the table indexes.

### Snooze presets computed on every render
**File:** `src/app/(app)/_components/read-only-email-view.tsx:161-179`
**Problem:** `getSnoozePresets()` is called on every render of `SnoozeMenu` (line 210), creating three `Date` objects each time. This is cheap enough to not matter in practice, but wrapping in `useMemo` would be more idiomatic.
**Note:** Minor optimization — `useMemo(() => getSnoozePresets(), [])` or compute inside the popover's open handler.

### Emerald color in trash restore button not in design system
**File:** `src/app/(app)/trash/_components/trash-card.tsx:140`
**Problem:** The restore button uses `bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/35` which is not part of the documented color palette in CLAUDE.md. The same emerald color is used in the gatekeeper approve button, so there is precedent, but it should be documented if it is an approved accent color.
**Note:** Consider adding emerald as a documented "success" accent in DESIGN.md, or use the existing orange accent with appropriate semantics.

---

## README

Does README.md need updating? No. The snooze and trash features are internal UI views that do not affect setup, environment variables, or architecture. The un-snooze worker runs inside the existing `sync.worker.ts` process, so no new process or configuration is needed.

---

## E2E tests to add

The following new user-visible flows should have e2e coverage:

1. **Snooze an email from detail view** — open an inbox email, click the snooze clock icon, select "Tomorrow morning", verify the email disappears from inbox, verify it appears in `/snoozed`.
2. **Unsnooze from snoozed list** — navigate to `/snoozed`, click unsnooze on a card, verify the card is removed from the list.
3. **Trash list and restore** — navigate to `/trash`, verify trashed emails appear, click restore on one, verify it moves back to inbox.
4. **Trash detail view** — click a trashed email to open `/trash/[id]`, verify the detail view renders with move-to and snooze actions.
