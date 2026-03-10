# Review: Gatekeeper list view — `47adae2`

**Date:** 2026-03-10
**Commits reviewed:** `47adae27`
**Files reviewed:**
- `src/app/(app)/gatekeeper/page.tsx`
- `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx`
- `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx`
- `src/app/(app)/_components/sidebar.tsx`
- `messages/en.json`

---

## Summary

Clean implementation that closely follows the established inbox list pattern. The rename from Screener to Gatekeeper is consistent across all UI-facing strings and routes, while correctly keeping the DB table name unchanged. The query structure, date serialization, hex color validation, and responsive layout all mirror the inbox approach. Code quality is solid with no security or data-integrity concerns. A few minor issues below.

---

## Critical Issues

None.

---

## Warnings

### Duplicate helper functions across inbox and gatekeeper
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:17-60`
**Problem:** `safeColor`, `avatarBgColor`, `getInitials`, and `formatDate` are duplicated verbatim from the inbox row component. The comment on line 15 acknowledges this ("kept co-located to avoid premature abstraction"), but with two consumers this is no longer premature -- divergent bug fixes are a real risk.
**Fix:** Extract these four functions into a shared module (e.g. `src/lib/format.ts` or `src/app/(app)/_utils/display.ts`) and import from both row components.

### `meta.description` in messages/en.json still references "Screener"
**File:** `messages/en.json:3`
**Problem:** The app description string says "...with Screener, Imbox, Feed, and Paper Trail" which is now inconsistent with the Gatekeeper rename.
**Fix:** Change "Screener" to "Gatekeeper" in the `meta.description` string.

### `layout.tsx` keywords still include "screener"
**File:** `src/app/layout.tsx:21`
**Problem:** The SEO keywords array includes `"screener"` but the feature is now called Gatekeeper in user-facing contexts.
**Fix:** Replace `"screener"` with `"gatekeeper"` in the keywords array (or keep both if the old term has SEO value -- that is a product decision).

---

## Suggestions

### Desktop sender name column uses fixed `w-40` and email column `w-44`
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:123,128`
**Note:** `w-40` (160px) and `w-44` (176px) are fine on typical desktops but could feel cramped on narrower `md` breakpoint screens (768-1024px) where the sidebar also takes space. Consider using `min-w-*` + `max-w-*` or `flex-shrink` instead of fixed widths, or test at exactly 768px with the sidebar expanded (224px sidebar leaves only ~544px for content).

### `GatekeeperList` calls `getTranslations` but only uses it for `countLabel`
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:17`
**Note:** The `getTranslations` call exists solely to format `t("messageCount", { count })` per row. This works but means the list component has a server-side data dependency that could be pushed up to the page. An alternative is to pre-compute all count labels in the page and pass them down, keeping the list a pure presentational component. Not a bug, just an architectural preference.

### `globals.css` still uses `--color-screener` CSS variable name
**File:** `src/app/globals.css:57`
**Note:** If this CSS variable is used anywhere in the UI, it should be renamed to `--color-gatekeeper` for consistency. If it is unused, it can be removed or left as-is for now.

---

## README

Does README.md need updating? No. The README does not reference "Screener" as a route or UI element in a way that this rename would break. The CLAUDE.md was already updated in this commit.

---

## E2E tests to add

The gatekeeper list view is a new user-visible page with a query, empty state, and row rendering. It should have basic e2e coverage.
