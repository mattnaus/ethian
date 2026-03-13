# Review: Fix HTML quote stripping — `e557859`

**Date:** 2026-03-13
**Commits reviewed:** `e5578590`
**Files reviewed:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`

---

## Summary

Clean, focused fix that addresses both warnings from the previous review (ca64c8f). The DOMParser approach correctly handles nested blockquotes and adds Gmail/Yahoo selectors. The SSR regex fallback is reasonable given this is a `"use client"` component where the regex path is unlikely to execute. The singleton removal is a minor clarity win. No security, lifecycle, or UI concerns.

---

## Critical Issues

None.

---

## Warnings

### SSR regex fallback still has the nested blockquote problem
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:84`
**Problem:** The SSR fallback regex `/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi` still uses a non-greedy quantifier and will leave stray `</blockquote>` closing tags on nested blockquotes -- the same issue the DOMParser branch was introduced to fix. Additionally, the SSR fallback does not strip `.gmail_quote` or `.yahoo_quoted` wrappers, so the two code paths produce different results for the same input.
**Fix:** This is low-risk because the component is `"use client"` and the SSR path is only hit during server-side rendering of the initial HTML (where `window` is undefined). The browser immediately hydrates with the DOMParser path. However, the inconsistency is worth noting. If the SSR output matters (e.g. for SEO or initial paint fidelity), consider using a server-compatible DOM parser like `linkedom` or `jsdom`. Otherwise, add a code comment explaining that SSR output is best-effort and will be corrected on hydration.

---

## Suggestions

### New EmailReplyParser instance per call is fine but wasteful in hot paths
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:92`
**Note:** `new EmailReplyParser().parseReply(bodyText)` allocates a new object per message render. For typical thread sizes (< 20 messages) this is negligible. If threads grow large or this function is called in list views, consider extracting a module-level constant again -- the previous review's concern was about the false impression of state, not about the allocation itself. No action needed now.

---

## README

Does README.md need updating? No. This is an internal display-layer fix with no new env vars, setup steps, or architecture changes.

---

## E2E tests to add

None. This is a rendering-layer fix for quote stripping. No new user flows, forms, or error states are introduced.
