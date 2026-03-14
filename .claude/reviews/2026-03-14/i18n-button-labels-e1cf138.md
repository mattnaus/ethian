# Review: Fix hardcoded button labels; strengthen i18n rule — `e1cf138`

**Date:** 2026-03-14
**Commits reviewed:** `e1cf138c`
**Files reviewed:** `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx`, `CLAUDE.md`, `messages/en.json`

---

## Summary

Small, focused fix that replaces two hardcoded English button labels ("Approve" and "Block") with `useTranslations()` calls. The corresponding keys (`pages.gatekeeper.approve` and `pages.gatekeeper.block`) already exist in `messages/en.json`, so this is a clean change. The CLAUDE.md update strengthens the i18n rule wording appropriately. Build passes without errors.

---

## Critical Issues

None.

---

## Warnings

None.

---

## Suggestions

None.

---

## README

Does README.md need updating? No. This change is an internal i18n fix and a developer convention clarification. Neither affects setup, architecture, or user-facing behaviour documented in the README.

---

## E2E tests to add

None.
