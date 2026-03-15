# Review: Bubble width, scroll-to-bottom, and dev:clean — `0c552f0`

**Date:** 2026-03-14
**Commits reviewed:** `f087227`, `a5cad91`, `cb71123`, `9d5195e`, `300152a`, `0c552f0`
**Files reviewed:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`, `package.json`

---

## Summary

Six small, focused commits addressing UI polish (bubble widths) and a scroll-to-bottom bug. The changes are clean and well-scoped. The bubble width progression (min-w -> min-w + w-full -> percentage width with max) shows good iterative refinement. The double-rAF scroll fix is a reasonable solution for layout timing. The `dev:clean` script is a sensible DX addition. Build passes with no TypeScript errors.

One pre-existing error handling gap in `handleSend` (not introduced by these commits but worth noting since the file was touched) and a minor stale ref concern in the rAF callback.

---

## Critical Issues

None.

---

## Warnings

### handleSend lacks try/catch (pre-existing, file was touched)
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:323-351`
**Problem:** `handleSend` calls `sendReplyAction` without a `try/catch`. If the Server Action throws (network error, serialization failure), the promise rejection is unhandled. The optimistic message stays in the UI with no error feedback. This deviates from the required pattern documented in CLAUDE.md (try/catch/finally with toast.error). `handleDiscardDraft` and `handleSendDraft` in the same file already follow the correct pattern.
**Fix:** Wrap the `sendReplyAction` call and result handling in `try/catch`, calling `toast.error(t("sendFailed"))` in the catch block and removing the optimistic message. This is pre-existing (introduced in `338d14f`), but since these commits touched the same file and function, it is worth flagging.

### Stale ref capture in double-rAF callback
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:309-314`
**Problem:** The outer `useEffect` captures `scrollContainerRef.current` as `el` on line 304, but the inner double-rAF callback re-reads `scrollContainerRef.current` on line 311. This is actually correct (re-reading the ref inside the deferred callback avoids stale captures). However, the `else` branch on line 317 uses the captured `el` variable inside a single rAF, which could be stale if the component unmounts and remounts between frames. Low probability in practice but inconsistent with the first-render branch.
**Fix:** Use `scrollContainerRef.current` instead of `el` in the else branch as well, for consistency: `const c = scrollContainerRef.current; if (c) c.scrollTo(...)`.

---

## Suggestions

### No cleanup for rAF in useEffect
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:303-321`
**Note:** The `useEffect` does not return a cleanup function to cancel pending `requestAnimationFrame` calls. If the component unmounts while a rAF is pending (e.g., user navigates away quickly), the callback will fire on an unmounted component. This is harmless in React (setting state on unmounted is a no-op in React 19) but adding `cancelAnimationFrame` in the cleanup return would be more correct.

### DraftBubble Discard button uses raw `<button>` instead of shadcn `<Button>`
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:231-242`
**Note:** The Discard button is a raw `<button>` with custom Tailwind classes, while Edit and Send use shadcn `<Button>`. This is a minor UI consistency deviation. Not introduced by these commits (pre-existing).

---

## README

Does README.md need updating? No. These are internal UI polish changes and a dev-only script addition that do not affect setup, architecture, or user-facing documentation.

---

## E2E tests to add

None. These commits are purely visual adjustments (bubble widths, scroll position) and a dev script. No new user-visible flows, forms, redirects, or error states were introduced.
