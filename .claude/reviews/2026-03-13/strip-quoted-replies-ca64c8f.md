# Review: Strip quoted reply content from message bubbles — `ca64c8f`

**Date:** 2026-03-13
**Commits reviewed:** `ca64c8fa`
**Files reviewed:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`, `package.json`

---

## Summary

Small, focused change that adds display-time stripping of quoted reply content from message bubbles. The approach is sound: strip on render, preserve originals in DB, use a battle-tested library for plain text and a simple regex for HTML blockquotes. The library has proper TypeScript types. One security-adjacent concern with the HTML regex (nested blockquotes), and one correctness issue with the regex approach for malformed HTML.

---

## Critical Issues

None.

---

## Warnings

### Nested blockquotes are not fully removed by the regex
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:80`
**Problem:** The regex `/<blockquote[\s\S]*?<\/blockquote>/gi` uses a non-greedy quantifier (`*?`). When blockquotes are nested (common in multi-level email threads), this matches the opening `<blockquote>` of the outer element to the closing `</blockquote>` of the innermost element, leaving the outer closing tag(s) as stray text. For example, `<blockquote>outer<blockquote>inner</blockquote></blockquote>` would leave `</blockquote>` as visible text after stripping tags.
**Fix:** Use a DOM parser (`DOMParser` in browser context since this is a `"use client"` component) to properly remove all `<blockquote>` elements:
```typescript
function stripHtmlQuotes(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("blockquote").forEach((el) => el.remove());
  return (doc.body.textContent ?? "").replace(/\s{2,}/g, " ").trim();
}
```
This handles nesting, malformed HTML, and unclosed tags correctly.

### Gmail div-based quoting is not stripped
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:76-84`
**Problem:** Gmail wraps quoted content in `<div class="gmail_quote">` instead of (or in addition to) `<blockquote>`. The current regex only targets `<blockquote>` elements, so Gmail HTML-only emails will still show quoted content.
**Fix:** If switching to `DOMParser` as suggested above, add `doc.querySelectorAll("blockquote, .gmail_quote, .yahoo_quoted").forEach(el => el.remove())`. If staying with regex, add a second regex for `<div class="gmail_quote"[\s\S]*?<\/div>` (with the same nesting caveat).

---

## Suggestions

### Module-level singleton is unnecessary
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:74`
**Note:** `const replyParser = new EmailReplyParser()` is instantiated at module scope, but `EmailReplyParser` is stateless -- `parseReply()` creates a fresh internal `Email` object each call. There is no benefit to reusing the instance. This is not a bug, but it creates the false impression that the parser accumulates state. A direct call like `new EmailReplyParser().parseReply(bodyText)` or a static import would be clearer. Low priority.

---

## README

Does README.md need updating? No. This is an internal display-layer change with no new env vars, setup steps, or architecture changes.

---

## E2E tests to add

None. This is a display-layer formatting change that strips quoted content from rendered message bodies. It does not introduce new user flows, forms, redirects, or error states. Testing the parsing logic would be better served by unit tests than e2e tests.
