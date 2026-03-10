# Review: trustHost for Tailscale redirect + rename /imbox to /inbox — `6914beb4`

**Date:** 2026-03-10
**Commits reviewed:** `6914beb4`
**Files reviewed:** `src/auth.ts`, `src/app/(app)/inbox/page.tsx`, `src/app/(auth)/_actions/auth.ts`, `src/middleware.ts`, `src/app/page.tsx`, `src/app/(app)/_components/sidebar.tsx`, `CLAUDE.md`, `tests/auth.spec.ts`, `tests/settings.spec.ts`, `tests/helpers/auth.ts`

---

## Summary

Clean, focused commit that addresses two small issues: adding `trustHost: true` to NextAuth for Tailscale compatibility, and renaming the `/imbox` route to `/inbox`. The rename is applied consistently across source files and tests. The `trustHost` fix is correct and necessary for reverse-proxy/Tailscale scenarios. Two issues: the page component still uses "Imbox" branding despite the route rename to `/inbox`, and several e2e test spec files in `.claude/e2e_tests_to_make/` still reference the old `/imbox` path.

---

## Critical Issues

None.

---

## Warnings

### Incomplete rename in e2e test spec files
**File:** `.claude/e2e_tests_to_make/collapsible-sidebar.md`, `.claude/e2e_tests_to_make/update-verification-and-mobile-nav.md`, `.claude/e2e_tests_to_make/smtp-verification-and-sidebar.md`
**Problem:** These files still reference `/imbox` in test steps and route tables. If someone writes e2e tests from these specs, they will target the old route and fail.
**Fix:** Find-and-replace `/imbox` with `/inbox` in all three files.

### README directory tree not updated
**File:** `README.md:244`
**Problem:** The README directory tree still says `(app)/` comment references "imbox": `# Authenticated views (imbox, feed, etc.)`. CLAUDE.md was updated but README.md was not.
**Fix:** Change `(imbox, feed, etc.)` to `(inbox, feed, etc.)` in README.md line 244.

---

## Suggestions

### Page component still uses "Imbox" branding after route rename
**File:** `src/app/(app)/inbox/page.tsx:3,5,9,13`
**Problem:** The route is now `/inbox` but the metadata title says "Imbox", the function is named `ImboxPage`, the heading says "Imbox", and the empty state says "Your Imbox is empty." This is presumably intentional (the Hey.com concept is "Imbox" while the URL is the more familiar `/inbox`), but the mismatch between URL and displayed name could confuse users. If the rename was meant to also change the user-facing label, these need updating. If "Imbox" is intentionally kept as branding, no action needed — but worth a conscious decision.
**Note:** Confirm whether the intent is to keep "Imbox" as the display name with an `/inbox` URL, or to rename everything to "Inbox".

---

## README

Yes. `README.md` line 244 still references `imbox` in the directory tree comment. Should be updated to `inbox` to match the actual route.

---

## E2E tests to add

None new. Existing e2e tests already cover the login/register redirect flows and were correctly updated to use `/inbox`. However, the e2e spec files in `.claude/e2e_tests_to_make/` need their `/imbox` references updated (noted as a Warning above).
