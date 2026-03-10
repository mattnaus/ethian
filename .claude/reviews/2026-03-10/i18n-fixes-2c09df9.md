# Review: i18n review fixes — `2c09df9`

**Date:** 2026-03-10
**Commits reviewed:** `2c09df98`
**Files reviewed:** `messages/en.json`, `src/types/next-intl.d.ts`, `src/middleware.ts`, `src/i18n/request.ts`, `src/app/(app)/settings/_actions/accounts.ts`, `src/app/(app)/settings/_components/accounts-list.tsx`, `src/app/layout.tsx`, `src/app/(app)/_components/sidebar.tsx`, `src/app/(app)/settings/_components/account-form.tsx`

---

## Summary

This commit addresses all findings from the previous i18n review (`ec7ccd8`). Every Critical, Warning, and Suggestion item has been resolved: the type declaration now uses the correct next-intl v4 `use-intl` module augmentation, middleware preserves intl cookies on auth redirects, `request.ts` validates locales before dynamic import, missing translation keys for port validation and sync status are added, metadata is translated via `generateMetadata()`, the sidebar brand name uses a translation key, the add-mode pending button has its own label, and developer-facing throws are documented with comments. The changes are minimal and focused. No new issues introduced.

---

## Critical Issues

None.

---

## Warnings

### `syncStatus` dynamic key is not type-checked at the template literal level
**File:** `src/app/(app)/settings/_components/accounts-list.tsx:91`
**Problem:** The expression `` t(`syncStatus.${account.syncStatus}`) `` constructs a translation key at runtime from the database enum value. If the `sync_status` Postgres enum gains a new value (e.g. `"paused"`) but the corresponding `syncStatus.paused` key is not added to `messages/en.json`, this will fail at runtime with a missing-key warning rather than a compile-time error. The next-intl type system cannot verify computed template literal keys.
**Fix:** Use a lookup map that TypeScript can statically verify:
```typescript
const syncStatusKeys = {
  idle: "syncStatus.idle",
  syncing: "syncStatus.syncing",
  error: "syncStatus.error",
} as const satisfies Record<MailAccount["syncStatus"], string>;

// then:
t(syncStatusKeys[account.syncStatus])
```
This ensures a type error if the enum is extended without updating the map.

---

## Suggestions

### `generateMetadata()` title values remain hardcoded
**File:** `src/app/layout.tsx:17-18`
**Note:** The `title.default` and `title.template` still contain the hardcoded string `"Ethian"`. The `nav.brandName` key exists and could be reused here for consistency. This is cosmetic — the brand name is unlikely to change per locale — but it would complete the extraction.

### Consider `Locale` type alias for the non-null assertion in `request.ts`
**File:** `src/i18n/request.ts:7`
**Note:** The `requested!` non-null assertion on line 7 is safe because the `includes()` check on line 6 guarantees it is defined when the truthy branch executes. A slightly cleaner approach would be to cast: `(requested as string)`, which avoids the `!` operator and its associated lint noise. Minor style point.

---

## README

Does README.md need updating? **No.** This commit fixes internal implementation details flagged during review. No new setup steps, env vars, or user-facing behaviour changes were introduced. The README update recommended in the previous review (documenting `messages/en.json` and `src/i18n/`) remains outstanding but is not attributable to this commit.

---

## E2E tests to add

None. No new user-visible flows were introduced. The existing auth and settings e2e tests continue to validate that translated strings render correctly.
