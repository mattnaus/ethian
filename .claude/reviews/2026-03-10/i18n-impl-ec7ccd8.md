# Review: i18n implementation (next-intl v4) — `ec7ccd8`

**Date:** 2026-03-10
**Commits reviewed:** `ec7ccd87`
**Files reviewed:** `messages/en.json`, `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/types/next-intl.d.ts`, `next.config.ts`, `src/middleware.ts`, `src/app/layout.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(auth)/login/_components/login-form.tsx`, `src/app/(auth)/register/_components/register-form.tsx`, `src/app/(auth)/_actions/auth.ts`, `src/app/(app)/_components/sidebar.tsx`, `src/app/(app)/settings/page.tsx`, `src/app/(app)/settings/_components/account-form.tsx`, `src/app/(app)/settings/_components/accounts-list.tsx`, `src/app/(app)/settings/_actions/accounts.ts`, `src/app/(app)/inbox/page.tsx`, `src/app/(app)/screener/page.tsx`, `src/app/(app)/saved/page.tsx`, `src/app/(app)/snoozed/page.tsx`, `src/app/(app)/sent/page.tsx`, `src/app/(app)/trash/page.tsx`

---

## Summary

Solid extraction of ~120 hardcoded strings into a single `messages/en.json` with clean namespace organisation. The middleware chaining, `NextIntlClientProvider` setup, and per-component `useTranslations`/`getTranslations` usage are all correct. The `translateFieldErrors()` helper is a reasonable approach to decoupling Zod from translations. Two issues stand out: (1) the type declaration file uses the next-intl **v3** augmentation pattern (`global IntlMessages`) instead of the v4 pattern (`use-intl` module augmentation of `AppConfig`), meaning all translation keys silently fall back to `Record<string, any>` with zero compile-time checking; and (2) the middleware discards next-intl response headers/cookies when it issues auth redirects.

---

## Critical Issues

### Type declaration uses next-intl v3 pattern — no compile-time key checking
**File:** `src/types/next-intl.d.ts:5-8`
**Problem:** The file augments `global { interface IntlMessages }`, which was the pattern for next-intl v3. In v4 (which this project uses at `^4.8.3`), the `Messages` type is resolved from `use-intl`'s `AppConfig` interface, not from a global `IntlMessages`. As a result, `Messages` falls back to `Record<string, any>` and every `t("someKey")` call accepts any string without type errors. A typo like `t("loginx")` would compile fine but fail at runtime.
**Fix:** Replace the entire file with:
```typescript
import en from "../../messages/en.json";

declare module "use-intl" {
  interface AppConfig {
    Messages: typeof en;
  }
}
```

---

## Warnings

### Middleware discards next-intl response headers on auth redirects
**File:** `src/middleware.ts:17-22`
**Problem:** When the middleware issues an auth redirect (lines 18 or 22), it creates a fresh `NextResponse.redirect()` that does not carry over any headers or cookies set by `intlMiddleware` on line 10 (e.g. the `NEXT_LOCALE` cookie). With `localePrefix: 'never'` and only one locale this is benign today, but will silently break locale detection when a second locale is added.
**Fix:** Copy intl cookies onto the redirect response:
```typescript
if (!isLoggedIn && !isAuthPage && pathname !== "/") {
  const redirect = NextResponse.redirect(new URL("/login", req.url));
  intlResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
```
Apply the same pattern to the `isLoggedIn && isAuthPage` redirect.

### `translateFieldErrors()` does not cover `imapPort` and `smtpPort` validation failures
**File:** `src/app/(app)/settings/_actions/accounts.ts:73-89`
**Problem:** The Zod schema validates `imapPort` and `smtpPort` (coerced integers, 1-65535). If a user enters a non-numeric or out-of-range port value, Zod will produce a field error for `imapPort` or `smtpPort`, but `translateFieldErrors()` has no mapping for these fields. The error will be silently dropped and the user will see no feedback for the invalid port.
**Fix:** Add translation keys `imapPortInvalid` and `smtpPortInvalid` to `settings.validation` in `messages/en.json`, and add mappings in `translateFieldErrors()`:
```typescript
if (zodErrors.imapPort?.length) result.imapPort = [t("imapPortInvalid")];
if (zodErrors.smtpPort?.length) result.smtpPort = [t("smtpPortInvalid")];
```

### `syncStatus` badge text is not translated
**File:** `src/app/(app)/settings/_components/accounts-list.tsx:91`
**Problem:** The `syncStatus` value (`"idle"`, `"syncing"`, `"error"`) is rendered directly as badge text via `{account.syncStatus}`. This is a hardcoded English string that was not extracted.
**Fix:** Add `syncStatus.idle`, `syncStatus.syncing`, `syncStatus.error` keys to `settings.accounts` in `messages/en.json` and render as `t(\`syncStatus.${account.syncStatus}\`)` (or use a lookup map for type safety).

### Metadata description in root layout is not translated
**File:** `src/app/layout.tsx:19-20`
**Problem:** The `description` field in the root `metadata` export contains hardcoded English text: `"Ethian — a calm, intentional email client..."`. This was not extracted to the message file.
**Fix:** This is a static export, so `getTranslations()` cannot be used directly in `metadata`. Either move to `generateMetadata()` (async function) and use `getTranslations()`, or accept this as intentional for SEO. If intentional, document the decision.

### Sidebar brand name "Ethian" / "E" is hardcoded
**File:** `src/app/(app)/_components/sidebar.tsx:174`
**Problem:** The sidebar header renders `{expanded ? "Ethian" : "E"}` as hardcoded strings instead of using a translation key. The auth layout correctly uses `t("brandName")`.
**Fix:** Add the sidebar to use the same `auth.brandName` key, or add a dedicated nav key. For the collapsed "E", either use `t("brandName").charAt(0)` or add a separate key.

---

## Suggestions

### Dynamic import in request.ts could use a locale allowlist check
**File:** `src/i18n/request.ts:8`
**Note:** The line `await import(\`../../messages/${locale}.json\`)` uses the locale from the request without validating it against `routing.locales`. If an unexpected locale value somehow makes it through, this will throw a module-not-found error at runtime. Add a guard: `const safeLocale = routing.locales.includes(locale) ? locale : routing.defaultLocale;`

### `addButton` text shown during pending state for add mode
**File:** `src/app/(app)/settings/_components/account-form.tsx:294`
**Note:** The ternary `isPending ? t("form.savingButton") : isEdit ? t("form.saveButton") : t("form.addButton")` shows "Saving..." for both add and edit when pending. Consider adding an `addingButton` key (e.g. "Adding...") for add mode to match the pattern used on auth forms (`submittingButton` vs `submitButton`).

### Error throw strings in `requireSession()` and `verifyOwnership()` are not translated
**File:** `src/app/(app)/settings/_actions/accounts.ts:51,64`
**Note:** `throw new Error("Not authenticated")` and `throw new Error("Account not found")` are developer-facing error strings that should not reach the UI (they indicate bugs or direct API manipulation). Translating them is not necessary, but documenting this intent with a comment would prevent future contributors from flagging them.

---

## README

Does README.md need updating? **Yes.** The README should mention:
1. The `messages/en.json` file and its role as the source of all UI strings.
2. The convention for adding new translations (add key to `en.json`, use `useTranslations`/`getTranslations`).
3. The `src/i18n/` directory in the architecture overview.

This does not affect setup steps or env vars, so the update is informational rather than blocking.

---

## E2E tests to add

None. The existing auth and settings e2e tests implicitly validate that translations render correctly (they check for visible text that now comes from `en.json`). No new user-visible flows were introduced.
