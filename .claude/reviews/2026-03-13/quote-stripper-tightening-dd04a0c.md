# Review: Tighten quote-stripper patterns — `dd04a0c`

**Date:** 2026-03-13
**Commits reviewed:** `dd04a0c0`
**Files reviewed:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`

---

## Summary

Small, focused fix that addresses the two warnings from the previous review. The changes are correct and well-scoped: the attribution regex now requires a 4-digit year (eliminating false positives on sentences like "On that topic, here is what I wrote:"), the `>` check is tightened to RFC 3676 format, the non-standard `"--"` signature variant is removed, and regex literals are hoisted to module scope. No security, lifecycle, or TypeScript issues introduced.

---

## Critical Issues

None.

---

## Warnings

### Multi-line attribution split regex is still compiled per-iteration
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:108`
**Problem:** The `ATTRIBUTION_RE` and `ATTRIBUTION_START_RE` regexes were correctly hoisted to module scope, but the `/wrote:$/` regex on line 108 is still an inline literal compiled on every loop iteration. This is the same class of issue the commit intended to fix.
**Fix:** Hoist `/wrote:$/` to a module-level constant (e.g. `const WROTE_SUFFIX_RE = /wrote:$/;`) and reference it on line 108.

---

## Suggestions

### Attribution regex could miss localized date formats without a year
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:91`
**Note:** The `\d{4}` requirement assumes the attribution line always includes a 4-digit year. Some email clients format dates without a year (e.g. "On Mar 13 at 10:00 AM, Alice wrote:"). This is an acceptable trade-off for now -- false negatives (showing quoted text) are less harmful than false positives (stripping real content) -- but worth noting for future refinement if users report unsplit quotes.

### Lone `>` check may still match edge cases
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:105`
**Note:** `line === ">"` matches a line that is exactly `>` with no trailing content. This is correct for RFC 3676 empty quote markers, but a body containing a line with just `>` (e.g. a mathematical "greater than" on its own line) would still trigger a false positive. This is extremely unlikely in practice and the current behavior (stopping early, with fallback to full body) is safe.

---

## README

Does README.md need updating? No. This is an internal display-logic refinement with no impact on setup, architecture, or user-facing behavior documentation.

---

## E2E tests to add

None. This is a display-layer text-processing change. The quote-stripping logic operates on in-memory strings and is best covered by unit tests rather than e2e tests. No new user-visible flows, forms, or error states are introduced.
