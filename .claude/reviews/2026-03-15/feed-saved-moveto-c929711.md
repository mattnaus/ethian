# Review: Feed & Saved Views, Move-to Actions, Gatekeeper Simplification — `c929711`

**Date:** 2026-03-15
**Commits reviewed:** `c929711`
**Files reviewed:**
- `src/app/(app)/_actions/move-email.ts`
- `src/app/(app)/_components/read-only-email-view.tsx`
- `src/app/(app)/feed/page.tsx`
- `src/app/(app)/feed/_components/feed-view.tsx`
- `src/app/(app)/feed/_components/feed-card.tsx`
- `src/app/(app)/feed/[emailId]/page.tsx`
- `src/app/(app)/saved/page.tsx`
- `src/app/(app)/saved/_components/saved-view.tsx`
- `src/app/(app)/saved/_components/saved-card.tsx`
- `src/app/(app)/saved/[emailId]/page.tsx`
- `src/app/(app)/inbox/_components/inbox-view.tsx`
- `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`
- `src/app/(app)/gatekeeper/_actions/decisions.ts`
- `src/app/(app)/_components/sidebar.tsx`
- `src/app/(app)/_components/mobile-nav-context.tsx`
- `messages/en.json`

---

## Summary

Solid feature delivery implementing Feed and Saved section views, a shared read-only email detail component, move-to actions with optional sender rule creation, and Gatekeeper simplification. The code follows established patterns well (date grouping, mailbox filter, search, mobile/desktop layouts). The build passes cleanly. There is one Critical XSS issue in the new `ReadOnlyEmailView` component and a missing try/catch in the move-email server action. Code duplication across the list views is notable but acceptable at this stage.

---

## Critical Issues

### 1. XSS via unsanitized HTML rendering in ReadOnlyEmailView
**File:** `src/app/(app)/_components/read-only-email-view.tsx:252`
**Problem:** Email body HTML is rendered via `dangerouslySetInnerHTML={{ __html: bodyContent }}` with zero sanitization. Email HTML can contain `<script>`, `<iframe>`, `onclick` handlers, `<img onerror>`, CSS `expression()`, and other XSS vectors. An attacker sending a crafted email can execute arbitrary JavaScript in the user's authenticated session, steal cookies/tokens, or perform actions on behalf of the user. The inbox detail view (`email-detail-view.tsx`) avoids this by stripping HTML to plain text via `getMessageBody()`, but this new component does not.
**Fix:** Sanitize HTML before rendering. Use a library like `dompurify` (server-side via `jsdom` or client-side) or `sanitize-html`. Strip `<script>`, `<iframe>`, `<object>`, `<embed>`, event handlers, `javascript:` URIs, and dangerous CSS. Example:
```ts
import DOMPurify from "dompurify";
const clean = DOMPurify.sanitize(bodyContent);
// then: dangerouslySetInnerHTML={{ __html: clean }}
```

### 2. Server action `moveEmailAction` missing try/catch around DB transaction
**File:** `src/app/(app)/_actions/move-email.ts:56`
**Problem:** The `db.transaction()` call is not wrapped in try/catch. If the transaction throws (network error, constraint violation, etc.), the unhandled exception propagates to the client. Per CLAUDE.md conventions, server actions must never throw to the client and should always return `{ success: false, error: "..." }`.
**Fix:** Wrap lines 56-81 in try/catch:
```ts
try {
  await db.transaction(async (tx) => {
    // ... existing code ...
  });
} catch (err) {
  console.error("[moveEmailAction] Transaction failed:", err);
  return { success: false, error: "Failed to move email" };
}
```

---

## Warnings

### 1. InboxMoveToMenu `handleMove` does not use `startTransition` or clear pending state
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:294-309`
**Problem:** `handleMove` wraps the async call in `void (async () => { ... })()` instead of using `startTransition` and a pending state flag. The reference pattern (`handleDecision` in `gatekeeper-list.tsx`) uses `startTransition` with `setPendingIds` in `finally`. The MoveToMenu in `read-only-email-view.tsx` (line 83) does use `startTransition` but also has no pending state tracking. While the popover closes immediately so the user cannot double-click, there is no loading indicator or protection against rapid re-invocation.
**Fix:** Use `useTransition` with `isPending` to disable the trigger button while the action is in flight, matching the reference pattern.

### 2. Duplicate `if (!row) notFound()` in feed detail page
**File:** `src/app/(app)/feed/[emailId]/page.tsx:70`
**Problem:** Line 51 already handles the case where `row` is null by calling `notFound()`. The second check at line 70 (after the attachment fetch) is dead code. The `row` variable cannot be null at this point because execution would have already halted.
**Fix:** Remove the duplicate check at line 70.

### 3. MoveToMenu in ReadOnlyEmailView has no pending/loading state
**File:** `src/app/(app)/_components/read-only-email-view.tsx:78-100`
**Problem:** The `MoveToMenu` component uses `useTransition` but discards the `isPending` value (line 78: `const [, startTransition] = useTransition()`). There is no visual feedback while the move action is in flight. The user could tap the move option, see nothing happen for a moment, and tap again.
**Fix:** Use `isPending` to show a loading state on the trigger button or disable interaction while the action runs.

---

## Suggestions

### 1. Extract shared list-view boilerplate
**Note:** `FeedView`, `SavedView`, `SentView`, and `DraftsView` share nearly identical code for date grouping, mailbox filtering, search, group dividers, mobile/desktop top bars, and FAB. This is ~200 lines duplicated four times. Consider extracting a generic `EmailListView` component that accepts a card render function, title, and email data.

### 2. Feed/Saved detail pages do not restrict access to emails of matching category
**File:** `src/app/(app)/feed/[emailId]/page.tsx:43-49`, `src/app/(app)/saved/[emailId]/page.tsx:43-49`
**Note:** The detail page queries check ownership but not that the email's category matches the section. A user can access `/feed/[id]` for an email that is actually in the inbox category. This is not a security issue (ownership is verified), but it is a UX inconsistency -- the MoveToMenu would show the wrong "current category" filter, and navigation would be confusing. Consider adding `eq(emails.category, "feed")` to the feed detail query (and likewise for saved).

### 3. `move-email.ts` co-location
**File:** `src/app/(app)/_actions/move-email.ts`
**Note:** CLAUDE.md convention says Server Actions should be co-located in `_actions/` near the route. This action is used from both inbox detail and read-only detail views, so placing it in the shared `(app)/_actions/` directory is reasonable. No change needed, just noting the deliberate deviation is justified.

---

## README

Does README.md need updating? No. This change does not affect setup, env vars, or architecture. The Feed and Saved views are internal feature additions.

---

## E2E tests to add

The following new user-visible flows should have e2e coverage:

1. **Feed list view** -- navigate to `/feed`, verify empty state renders, verify emails with category "feed" appear
2. **Saved list view** -- navigate to `/saved`, verify empty state renders, verify emails with category "paper_trail" appear
3. **Move-to action** -- from an inbox email detail, use the Move-to menu to move an email to Feed, verify it disappears from inbox and appears in feed
4. **Read-only detail view** -- click a feed/saved email, verify the detail view renders with subject, sender, body, and back navigation works
