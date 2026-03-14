# Review: Fix hydration mismatch on message timestamp — `b1726f8`

**Date:** 2026-03-14
**Commits reviewed:** `b1726f83`
**Files reviewed:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`

---

## Summary

The change adds `suppressHydrationWarning` to the timestamp `<span>` in `MessageBubble` to paper over ICU data differences between Node.js and the browser. The fix works but is a bandaid — it suppresses the symptom without eliminating the root cause, and it only covers one of the two date values rendered on that element. The `title` attribute still uses `formatFullDate` and will silently differ between server and client without any warning, which is exactly the kind of quiet inconsistency `suppressHydrationWarning` is meant to prevent for intentional differences (like `Date.now()`), not for accidental formatting divergence.

---

## Critical Issues

None.

---

## Warnings

### `suppressHydrationWarning` only suppresses text content, not the `title` attribute
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:195`
**Problem:** `suppressHydrationWarning` suppresses React's hydration warning for the **text content** of the element. The `title={fullDate}` attribute is set during SSR using `formatFullDate`, which has the same ICU divergence problem. React does not suppress attribute mismatches — it will still produce a hydration error if the `title` value differs, or silently use the server value (depending on React version). Either way, the user may see the wrong tooltip.
**Fix:** Render dates exclusively on the client. Move the `formatTime` and `formatFullDate` calls into a `useState`/`useEffect` pair so the server renders a placeholder (or empty string) and the client fills in the formatted date after mount. This eliminates the mismatch entirely and removes the need for `suppressHydrationWarning`. Example pattern:

```tsx
const [time, setTime] = useState("");
const [fullDate, setFullDate] = useState("");
useEffect(() => {
  setTime(formatTime(message.sentAt, locale));
  setFullDate(formatFullDate(message.sentAt, locale));
}, [message.sentAt, locale]);
```

### `formatFullDate` in this file duplicates logic that will diverge from `email-display.ts`
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:63-72`
**Problem:** The file defines its own `formatTime` and `formatFullDate` functions using `Intl.DateTimeFormat`. The shared `src/lib/email-display.ts` already has `formatDate` and `formatRelativeDate`. Having two sets of date formatting functions means future fixes (like the hydration fix above) must be applied in two places. The `email-card.tsx` component (inbox list) uses `formatRelativeDate` from `email-display.ts`, which also calls `Intl.DateTimeFormat` for dates older than 7 days — it has the same latent hydration risk but is not addressed by this commit.
**Fix:** Consolidate all date formatting into `src/lib/email-display.ts`. Add `formatTime` and `formatFullDate` there and import them in `email-detail-view.tsx`. Apply the client-only rendering pattern consistently wherever `Intl.DateTimeFormat` is used in client components.

### `email-card.tsx` has the same latent hydration mismatch
**File:** `src/app/(app)/inbox/_components/email-card.tsx:38`
**Problem:** `email-card.tsx` is a `"use client"` component that calls `formatRelativeDate`, which falls through to `Intl.DateTimeFormat` for emails older than 7 days. This will produce the same server/client ICU mismatch for those emails. The fix in this commit does not address it.
**Fix:** Apply the same client-only rendering approach to the date output in `email-card.tsx`.

---

## Suggestions

### `suppressHydrationWarning` is the wrong tool for this problem
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:195`
**Note:** `suppressHydrationWarning` is designed for cases where the mismatch is intentional and harmless (e.g., `Date.now()` timestamps that differ by milliseconds). Here, the mismatch is unintentional — the server and client produce semantically different strings ("Mar 13, 8:03 PM" vs "Mar 13 at 8:03 PM"). The correct fix is to avoid server-rendering locale-sensitive dates altogether, which is a well-known pattern in Next.js apps. This both eliminates the warning and ensures the user always sees the browser-formatted date.

---

## README

Does README.md need updating? No. This is an internal bug fix with no impact on setup, architecture, or user-facing behaviour.

---

## E2E tests to add

None. Hydration mismatches are not observable via Playwright (which runs in the browser where hydration has already completed). This is a development-time warning, not a user-facing bug.
