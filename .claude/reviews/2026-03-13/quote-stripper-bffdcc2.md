# Review: Replace email-reply-parser with hand-rolled quote stripper — `bffdcc2`

**Date:** 2026-03-13
**Commits reviewed:** `bffdcc21`
**Files reviewed:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`, `package.json`

---

## Summary

A targeted fix for a real build-breaking issue: `email-reply-parser` pulls in Node's `module` builtin, which cannot be bundled in a client component. The replacement `stripPlainTextQuotes()` is simple and readable. The fallback to full body text in `getMessageBody()` is a good safety net. There are a few regex edge cases worth addressing to avoid false positives that would silently truncate email content.

---

## Critical Issues

None.

---

## Warnings

### "On ... wrote:" regex matches too broadly — can truncate legitimate email body
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:102`
**Problem:** The regex `/^On .+wrote:$/.test(line)` matches any line starting with "On " and ending with "wrote:". This fires on legitimate sentences like "On that topic, here is what I wrote:" or "On Monday I finally wrote:". The two-line variant on line 103 (`/^On .+/` + `/wrote:$/`) is even broader — any line starting with "On" followed by any next line ending in "wrote:" will cause everything below to be stripped. Because the function breaks out of the loop (discarding the rest of the email), a false positive silently loses visible content.
**Fix:** Tighten the regex to require a date-like pattern and an email/name before "wrote:". A pattern like `/^On .{10,80} wrote:$/` is a minimal improvement, but a better approach is to require known attribution markers:
```ts
// Matches: "On Mon, Jan 1, 2026 at 10:00 AM John Doe <john@example.com> wrote:"
// Also: "On 1 Jan 2026, 10:00, john@example.com wrote:"
const ATTRIBUTION_RE = /^On\s.+\d{4}.+wrote:$/;
```
This requires a 4-digit year somewhere in the line, which eliminates almost all false positives while catching Gmail, Apple Mail, and Outlook attribution lines.

### Single `>` at start of line halts parsing — blank-line-then-quote scenario
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:100`
**Problem:** The check `line.startsWith(">")` breaks on the first `>` line encountered, which is correct for trailing quotes. However, some email bodies contain inline `>` characters at the start of a line (markdown quoting in the body, or ">" used as an arrow/greater-than). These would cause the function to discard everything from that point forward. This is a minor risk but worth noting since the function has no way to distinguish inline usage from reply quoting.
**Fix:** Consider requiring `"> "` (with a trailing space) which is the standard RFC 3676 quote prefix, rather than bare `>`. Change to: `if (line.startsWith("> ") || line === ">") break;`

---

## Suggestions

### `line === "--"` is non-standard and may over-match
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:105`
**Note:** The standard signature delimiter is `"-- "` (dash-dash-space, per RFC 3676). The addition of `line === "--"` (without trailing space) catches a common real-world variation, but it also matches lines where someone typed two dashes as a visual separator in the middle of their message. This is a judgment call — the current behavior is reasonable but could occasionally truncate content at a decorative `--` line.

### Regexes are compiled on every call
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:102-103`
**Note:** The two regex literals inside the loop body (`/^On .+wrote:$/`, `/^On .+/`, `/wrote:$/`) are re-compiled on every iteration of every call. For a display-time function this is unlikely to cause a performance problem, but hoisting them to module-level constants is trivially cleaner:
```ts
const RE_ATTRIBUTION = /^On .+wrote:$/;
const RE_ATTRIBUTION_START = /^On .+/;
const RE_WROTE_END = /wrote:$/;
```

---

## README

Does README.md need updating? No. This is an internal implementation swap with no change to setup, architecture, or user-facing behavior.

---

## E2E tests to add

None. Quote stripping is a display-level helper function that does not change user-visible flows, routes, or interactions. Unit tests would be more appropriate than e2e tests for validating edge cases, but that is outside the scope of this commit's intent.
