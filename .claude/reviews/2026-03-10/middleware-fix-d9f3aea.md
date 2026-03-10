# Review: Middleware i18n fix -- `d9f3aea8`

**Date:** 2026-03-10
**Commits reviewed:** `d9f3aea8`
**Files reviewed:** `src/middleware.ts`, `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/app/layout.tsx`, `next.config.ts`

---

## Summary

Clean, minimal fix for a real 404-causing bug. Removing `createIntlMiddleware` and replacing it with a manual `X-NEXT-INTL-LOCALE` header is the correct approach for a single-locale, no-prefix setup. The diff is small and well-scoped. The commit message accurately explains the root cause and fix. Two minor issues below.

---

## Critical Issues

None.

---

## Warnings

### Hardcoded locale string duplicates the source of truth
**File:** `src/middleware.ts:20`
**Problem:** The locale `"en"` is hardcoded in the middleware header. The canonical default locale is already defined in `src/i18n/routing.ts` as `routing.defaultLocale`. If a second locale is added or the default changes, this middleware will silently stay on `"en"` and diverge from the routing config.
**Fix:** Import `routing` from `@/i18n/routing` and use `routing.defaultLocale` instead of the string literal:
```ts
import { routing } from "@/i18n/routing";
// ...
headers.set("X-NEXT-INTL-LOCALE", routing.defaultLocale);
```

### Previous cookie-forwarding fix from 2c09df9 was deleted, not superseded
**File:** `src/middleware.ts`
**Problem:** Commit `2c09df9` added cookie forwarding on redirect responses specifically to preserve the `NEXT_LOCALE` cookie set by `createIntlMiddleware`. This commit correctly removes both the middleware call and the cookie forwarding since neither is needed anymore. However, the work log in `.claude/work/20260310.md` still documents the cookie-forwarding fix as a standalone improvement (entry for `2c09df9`). This is not a code issue but a documentation inconsistency -- the `2c09df9` fix is now entirely reverted. No action required unless you want to annotate the work log.

---

## Suggestions

### Remove unused `next-intl/middleware` dependency entry point
**File:** `package.json`
**Note:** The `createIntlMiddleware` import from `next-intl/middleware` is no longer used anywhere in the codebase. The `next-intl` package itself is still needed (for `next-intl/server`, `next-intl/plugin`, `NextIntlClientProvider`), so the package stays. No action needed -- this is just a note that the middleware sub-path is now dead code from this project's perspective. Tree-shaking will handle it.

### `routing.ts` is now only consumed by `request.ts`
**File:** `src/i18n/routing.ts`
**Note:** With the middleware no longer importing `routing`, the only consumer is `src/i18n/request.ts` (for the locale allowlist check). The file is still useful as a single source of truth for locale config, but if it ever becomes truly orphaned, it should be inlined into `request.ts`.

---

## README

Does README.md need updating? No. The README does not mention next-intl, middleware internals, or locale configuration. This is an internal implementation fix with no user-facing or setup impact.

---

## E2E tests to add

None. The middleware auth redirect behavior is already covered by existing auth e2e tests (`tests/auth.spec.ts`). The locale header is an internal implementation detail that does not produce user-visible behavior changes worth testing at the e2e level.
