# Review: Toast error feedback on failed gatekeeper decisions — `7175a7e`

**Date:** 2026-03-14
**Commits reviewed:** `7175a7e3`
**Files reviewed:**
- `src/app/layout.tsx`
- `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx`
- `messages/en.json`
- `package.json`

---

## Summary

Small, well-scoped change. Adds sonner for toast notifications, wraps the gatekeeper decision call in try/catch/finally, and shows a translated error message on failure. The `finally` block correctly clears pending state regardless of outcome, fixing the previous bug where a failed decision would leave the entry permanently dimmed. Build passes. No security, i18n, or TypeScript concerns.

---

## Critical Issues

None.

---

## Warnings

None.

---

## Suggestions

### Consider adding `toastOptions` for design system alignment
**File:** `src/app/layout.tsx:39`
**Note:** Sonner's default dark theme uses its own grays, which may not perfectly match the zinc/OKLCH palette defined in `globals.css`. Adding `toastOptions={{ className: "..." }}` or `toastOptions={{ style: { background: 'var(--popover)', border: '1px solid var(--border)', color: 'var(--foreground)' } }}` would ensure toasts blend with the rest of the UI. Low priority since the defaults look acceptable in a dark theme.

### Consider adding a success toast on approve/block
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:196-198`
**Note:** Currently only failure shows a toast. A brief `toast.success` on successful approve/block would give positive feedback, especially since the entry removal animation is the only signal right now. This is a UX preference, not a bug.

---

## README

No. This change does not affect setup, env vars, architecture, or user-facing configuration. Sonner is an internal UI dependency.

---

## E2E tests to add

None. The error path (server action returning `{ success: false }`) would require mocking the server action, which is outside the scope of the current e2e test infrastructure. The happy path (approve/block) is already a candidate from the gatekeeper decisions review.
