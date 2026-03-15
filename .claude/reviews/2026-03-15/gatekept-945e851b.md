# Review: Gatekept sender rules management page — `945e851b`

**Date:** 2026-03-15
**Commits reviewed:** `945e851b`
**Files reviewed:**
- `messages/en.json`
- `src/app/(app)/_components/sidebar.tsx`
- `src/app/(app)/_components/mobile-nav-context.tsx`
- `src/app/(app)/gatekept/_actions/rules.ts`
- `src/app/(app)/gatekept/page.tsx`
- `src/app/(app)/gatekept/_components/gatekept-list.tsx`
- `src/app/(app)/gatekept/_components/gatekept-card.tsx`

---

## Summary

Solid implementation overall. The server actions follow the correct `{ success, error }` return pattern, client-side error handling follows the reference `try/catch/finally` pattern with toast notifications, auth checks are present, and i18n coverage is thorough. The main concern is that replacing the Gatekeeper sidebar link with Gatekept removes the only navigation path to the screening UI. There is also one hardcoded string and a minor SQL wildcard-escaping gap.

---

## Critical Issues

### Gatekeeper page is now unreachable from navigation
**File:** `src/app/(app)/_components/sidebar.tsx:108`
**Problem:** The sidebar link to `/gatekeeper` was replaced with `/gatekept`. The Gatekeeper page -- where users screen unknown senders -- is now unreachable from both the desktop sidebar and the mobile drawer. The `/gatekeeper` route still exists and functions, but there is no navigation affordance to reach it. This breaks the core screening workflow.
**Fix:** Add both items to the nav: keep `/gatekeeper` (with `ShieldQuestion` icon and the original "Gatekeeper" label) and add `/gatekept` as a second entry. Alternatively, combine them into a single page with tabs, or add a link from the Gatekept page to the Gatekeeper. The sidebar and mobile drawer nav item arrays in both `sidebar.tsx` and `mobile-nav-context.tsx` need to include both routes.

---

## Warnings

### Hardcoded UI string in footer
**File:** `src/app/(app)/gatekept/_components/gatekept-list.tsx:301`
**Problem:** The string `Showing {rules.length} of {total}` is hardcoded in English. All user-visible strings must come from `messages/en.json` via `t()`. The Gatekeeper list uses `t("showingOf", { shown, total })` for the same pattern.
**Fix:** Add a `showingOf` key to the `pages.gatekept` namespace in `messages/en.json` (e.g. `"showingOf": "Showing {shown} of {total}"`) and use `t("showingOf", { shown: rules.length, total })`.

### LIKE pattern does not escape SQL wildcards in domain
**File:** `src/app/(app)/gatekept/_actions/rules.ts:71`
**Problem:** The `like(emails.fromAddress, \`%@${rule.fromDomain}\`)` pattern uses `rule.fromDomain` from the database without escaping SQL LIKE wildcards (`%` and `_`). If a domain value contains these characters (e.g. `some_domain.com`), the `_` would match any single character, potentially re-categorizing emails from unintended senders. The risk is low since domains rarely contain these characters and the value originates from server-side processing, but it is technically incorrect.
**Fix:** Escape `%` and `_` in the domain before interpolation: `const safeDomain = rule.fromDomain.replace(/%/g, '\\%').replace(/_/g, '\\_');` then use `like(emails.fromAddress, \`%@${safeDomain}\`)`.

---

## Suggestions

### Filter tab labels duplicate decision labels
**File:** `messages/en.json:202-214`
**Note:** The keys `filterApproved`/`groupApproved`/`decisionApproved` (and their Feed, Paper Trail, Blocked equivalents) all have the same value. Consider consolidating to reduce duplication -- e.g. a single `decision.approved` key reused across filter tabs, group dividers, and badges. This is purely a maintenance concern; the current approach works correctly.

### Desktop filter tab buttons lack minimum touch target height
**File:** `src/app/(app)/gatekept/_components/gatekept-list.tsx:195`
**Note:** Desktop filter tab buttons use `py-1.5` which results in a height well under 44px. On desktop this is fine, but note that the mobile filter pills correctly use `min-h-[44px]` (line 246). No action needed since the desktop buttons are hidden on mobile via `hidden md:block`.

---

## README

Does README.md need updating? No. This is a new internal page that does not change setup, environment variables, or architecture. The feature is discoverable through the sidebar.

---

## E2E tests to add

The Gatekept page introduces several new user-visible flows that should have e2e coverage:

1. **Gatekept page loads and displays sender rules** -- navigate to `/gatekept`, verify rules are listed with correct decision badges.
2. **Filter tabs work** -- click each filter tab (All, Approved, Feed, Paper Trail, Blocked) and verify the list updates.
3. **Search filters rules** -- type in the search input and verify matching rules are shown.
4. **Change decision via Popover** -- click a decision badge, select a new decision, verify the badge updates.
5. **Delete rule via AlertDialog** -- click delete, confirm in dialog, verify the rule is removed from the list.
