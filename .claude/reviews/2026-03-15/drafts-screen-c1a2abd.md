# Review: Rebuild Drafts screen — `c1a2abd`

**Date:** 2026-03-15
**Commits reviewed:** `c1a2abd`
**Files reviewed:**
- `src/app/(app)/drafts/page.tsx`
- `src/app/(app)/drafts/_components/draft-card.tsx`
- `src/app/(app)/drafts/_components/drafts-view.tsx`
- `src/app/(app)/_components/mobile-nav-context.tsx`
- `messages/en.json`

---

## Summary

Solid implementation that closely mirrors the existing Inbox patterns. The server component page, client-side filtering/search, date grouping, and mobile layout all follow established conventions. The build passes cleanly with no type errors. Two hardcoded UI strings violate the i18n rules and need fixing. The mobile FAB lacks safe-area-inset padding. No security or error handling concerns since this is a read-only view with no Server Action calls.

---

## Critical Issues

None.

---

## Warnings

### Hardcoded "(no subject)" string
**File:** `src/app/(app)/drafts/_components/draft-card.tsx:83`
**Problem:** The string `"(no subject)"` is hardcoded instead of using the existing `pages.drafts.noSubject` translation key from `messages/en.json`.
**Fix:** The `DraftCard` component needs access to translations. Either pass the translated string as a prop from `DraftsView`, or add `useTranslations("pages.drafts")` inside `DraftCard` and replace `"(no subject)"` with `t("noSubject")`.

### Hardcoded "Draft" fallback string
**File:** `src/app/(app)/drafts/_components/draft-card.tsx:35`
**Problem:** The string `"Draft"` is hardcoded as a fallback when there are no recipients. All user-visible strings must come from `messages/en.json`.
**Fix:** Add a key like `"noRecipient": "Draft"` to `pages.drafts` in `messages/en.json` and use `t("noRecipient")` instead. This requires adding `useTranslations` to the component or passing the fallback as a prop.

### Mobile FAB missing safe-area-inset padding
**File:** `src/app/(app)/drafts/_components/drafts-view.tsx:356`
**Problem:** The mobile floating action button uses `bottom-6` (24px) which may be obscured by the iOS home indicator in standalone PWA mode. The CLAUDE.md design system requires accounting for `env(safe-area-inset-bottom)` on fixed bottom elements.
**Fix:** Change `bottom-6` to a value that incorporates the safe area, e.g. `style={{ bottom: "max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom)))" }}` or use the `pb-safe` utility if available.

---

## Suggestions

### `toLocaleString("default", ...)` ignores user locale
**File:** `src/app/(app)/drafts/_components/drafts-view.tsx:42`
**Note:** The `getGroupLabel` function uses `"default"` as the locale argument for `toLocaleString`, which uses the server/browser default locale rather than the user's configured locale. This is consistent with the Inbox implementation (same pattern at `inbox-view.tsx:53`), so not a regression, but both should eventually pass the actual locale for correct month name rendering in non-English locales.

### `DraftCard` could receive translations via props to avoid extra hook
**File:** `src/app/(app)/drafts/_components/draft-card.tsx`
**Note:** If adding `useTranslations` to `DraftCard` (to fix the hardcoded strings above), consider whether it is better to pass the two translated fallback strings as props from `DraftsView` to keep the card component simpler and avoid an additional hook call per card instance.

---

## README

Does README.md need updating? No. The Drafts screen replaces an existing placeholder page and does not introduce new env vars, setup steps, or architectural changes.

---

## E2E tests to add

None. The Drafts screen is a read-only list view with client-side filtering. The existing app shell and navigation e2e tests cover page reachability. Dedicated Drafts e2e tests would require draft email fixtures in the test database, which is better addressed when the compose/draft-saving flow is built.
