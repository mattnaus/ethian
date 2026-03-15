# Review: Message bubble & draft button styling — `f087227`

**Date:** 2026-03-14
**Commits reviewed:** `f0872276`
**Files reviewed:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`

---

## Summary

A two-line styling change: wider message bubble min-width on desktop and an outline variant for the draft Edit button. The build passes, no logic was changed, no new strings were added. The changes are correct and low-risk. One minor responsiveness concern noted below.

---

## Critical Issues

None.

---

## Warnings

None.

---

## Suggestions

### `md:min-w-96` (384px) may cause horizontal overflow on narrow tablets

**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:166`
**Note:** The bubble container already has `max-w-[90%] md:max-w-[72%]`, which should prevent overflow in practice because 384px is well within 72% of any `md` (768px+) viewport. However, if the outer `max-w-5xl` container ever gets constrained (e.g. inside a split-pane layout in the future), the `min-w-96` could fight with the `max-w-[72%]` since `min-width` wins over `max-width` in CSS. No action needed now, but worth keeping in mind.

---

## README

Does README.md need updating? No. This is a purely cosmetic change to existing UI.

---

## E2E tests to add

None.
