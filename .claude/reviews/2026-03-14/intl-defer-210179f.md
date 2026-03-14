# Review: Defer Intl date formatting to client — `210179f`

**Date:** 2026-03-14
**Commits reviewed:** `210179f`
**Files reviewed:** `src/lib/email-display.ts`, `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`, `src/app/(app)/inbox/_components/email-card.tsx`

---

## Summary

Clean, focused change that properly fixes the hydration mismatch caused by `Intl.DateTimeFormat` producing different output on server vs client. The approach — deferring formatting to a `useEffect` with empty initial state — is the standard Next.js pattern for locale-sensitive rendering. Extracting `formatTime` and `formatFullDate` into `email-display.ts` removes duplication. No security, IMAP/SMTP, or error handling concerns. Two minor items noted below.

---

## Critical Issues

None.

---

## Warnings

### Dates flash empty on first paint
**File:** `src/app/(app)/inbox/_components/email-card.tsx:40-43` and `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:143-148`
**Problem:** `useState("")` means the date/time text is invisible until the `useEffect` fires after hydration. On a list of emails this produces a visible flash where the date column is blank, then pops in. On the detail view, timestamps under every message bubble appear empty momentarily.
**Fix:** Initialize the state with the formatted value computed at module scope or from a server-passed pre-formatted string, and let `useEffect` correct it if needed. Alternatively, render a fixed-width skeleton/placeholder (e.g. an invisible `&nbsp;` with `min-w-*`) to prevent layout shift even if the text itself is deferred.

---

## Suggestions

### `formatRelativeDate` will go stale on long-lived tabs
**File:** `src/lib/email-display.ts:74-85`
**Note:** `formatRelativeDate` computes "5m ago" at render time but never re-runs. If the user keeps the inbox tab open, the relative times become incorrect. This is pre-existing, not introduced by this commit, but worth noting for future work — a periodic re-render (e.g. every 60s via `setInterval` in the `useEffect`) would keep them accurate.

### `hour12: true` is hard-coded
**File:** `src/lib/email-display.ts:38` and `src/lib/email-display.ts:48`
**Note:** Forcing 12-hour clock regardless of locale means users in locales that prefer 24-hour time (most of Europe) see an unfamiliar format. Omitting `hour12` lets `Intl.DateTimeFormat` use the locale default. Low priority given single-locale status, but worth considering before adding more locales.

---

## README

Does README.md need updating? No. This is an internal rendering fix with no setup, architecture, or user-facing behaviour changes.

---

## E2E tests to add

None. This fixes a hydration mismatch — the correct behavior is that dates render without React warnings. Hydration errors are not observable via Playwright assertions and the underlying formatting logic is unchanged.
