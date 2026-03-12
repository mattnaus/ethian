# Review: Subject/snippet truncate fix — `45cac87`

**Date:** 2026-03-12
**Commits reviewed:** `45cac875`
**Files reviewed:** `src/app/(app)/inbox/_components/email-card.tsx`, `src/app/(app)/inbox/_components/inbox-view.tsx`

---

## Summary

Clean, minimal fix. The change from two competing flex children (subject + snippet) to a single block-level `truncate` container with inline children is the correct approach. The `truncate` class on the outer `div` (which applies `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`) treats the subject and snippet as a single text run, so the ellipsis always appears at the natural end of the combined content. The snippet, being later in the flow, clips first. The mobile layout is unaffected because the inline snippet is `hidden md:inline` and the separate `<p>` element for mobile snippet sits outside the truncated div. No security, IMAP, or error-handling concerns — this is a pure CSS/layout change.

---

## Critical Issues

None.

---

## Warnings

None.

---

## Suggestions

### Redundant `min-w-0` on inner div
**File:** `src/app/(app)/inbox/_components/email-card.tsx:86`
**Note:** The inner `div` has `className="truncate min-w-0 text-sm"`. The `truncate` utility already includes `overflow: hidden`, which establishes a new block formatting context that prevents content from expanding beyond the parent. The `min-w-0` on this inner div is redundant — it is already applied on the parent (`flex-1 min-w-0` on line 85), which is where it matters for flex layout. Removing `min-w-0` from line 86 would reduce noise, but it causes no harm.

### Very long single-word subjects
**File:** `src/app/(app)/inbox/_components/email-card.tsx:86-88`
**Note:** A subject consisting of a single very long word (no spaces) will truncate correctly with this approach. `truncate` (which uses `text-overflow: ellipsis` + `overflow: hidden` + `white-space: nowrap`) does not require word-break opportunities — it clips at the container boundary regardless. This is not a problem.

---

## README

Does README.md need updating? No. This is a CSS-only fix to an existing component with no impact on setup, architecture, or user-facing behaviour documentation.

---

## E2E tests to add

None. This is a visual truncation fix. The correctness of text overflow is best verified visually or with snapshot/screenshot tests, not with functional e2e assertions. The existing inbox rendering is already covered by the inbox data flow.
