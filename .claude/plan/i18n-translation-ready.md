# Plan: Make Ethian Translation-Ready (i18n)

## Context

The application has ~110–120 hardcoded user-facing strings directly in TSX files and Server Actions. There is zero i18n infrastructure. This plan extracts all strings into translation files using **next-intl**, without changing any URL routes (no `/en/inbox` prefixing — locale is detected from cookies/headers only).

---

## Library: next-intl with `localePrefix: 'never'`

**Why next-intl:**
- Purpose-built for Next.js 15 App Router
- First-class TypeScript support — translation keys are typed
- Works in Server Components, Client Components, and Server Actions
- `localePrefix: 'never'` keeps all URLs unchanged (`/inbox` stays `/inbox`)

---

## Implementation Steps

### 1. Install
```bash
npm install next-intl
```

### 2. Create `/messages/en.json`
Extract all strings, organized by namespace:

```json
{
  "common": { "cancel": "Cancel", "save": "Save changes", "saving": "Saving…", "edit": "Edit", "delete": "Delete", "add": "Add" },
  "auth": {
    "login": { "title": "Sign in", "subtitle": "...", "email": "Email", ... },
    "register": { "title": "Create an account", ... },
    "errors": { "invalidCredentials": "Invalid email or password", ... }
  },
  "nav": { "inbox": "Inbox", "screener": "Screener", "saved": "Saved", ... },
  "settings": {
    "accounts": { "title": "Mail accounts", "addAccount": "Add account", ... },
    "form": { "displayName": "Display name", "imapHost": "Host", ... },
    "errors": { "imapConnectionFailed": "Could not connect to IMAP server...", ... }
  },
  "inbox": { "empty": "Your inbox is empty. Add a mail account in Settings to get started." },
  "placeholders": { ... }
}
```

### 3. Create `src/i18n/routing.ts`
```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en'],
  defaultLocale: 'en',
  localePrefix: 'never'  // ← keeps all URLs unchanged
});
```

### 4. Create `src/i18n/request.ts`
```ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
```

### 5. Update `next.config.ts`
```ts
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
export default withNextIntl({ ...existingConfig });
```

### 6. Update `src/middleware.ts`
Chain existing NextAuth middleware with next-intl locale detection:
```ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
// compose with existing NextAuth middleware
```
next-intl's middleware handles setting the locale cookie/header; NextAuth handles auth. Both run on matched routes.

### 7. Update root layout (`src/app/layout.tsx`)
- Import `getLocale`, `getMessages` from `next-intl/server`
- Set `<html lang={locale}>`
- Wrap children in `<NextIntlClientProvider messages={messages}>`

No route restructuring needed — layout stays at `src/app/layout.tsx`.

### 8. Extract strings in UI files

**Client Components** — use `useTranslations()` hook:
- `src/app/(app)/_components/sidebar.tsx` — 25+ strings (nav labels, tooltips, colors)
- `src/app/(app)/settings/_components/account-form.tsx` — 40+ strings (form labels, placeholders, section headers)
- `src/app/(app)/settings/_components/accounts-list.tsx` — 15+ strings
- `src/app/(auth)/login/_components/login-form.tsx` — 8 strings
- `src/app/(auth)/register/_components/register-form.tsx` — 12 strings

**Server Components** — use `getTranslations()`:
- `src/app/(app)/settings/page.tsx` — 2 strings
- `src/app/(app)/inbox/page.tsx` — 2 strings

### 9. Extract strings in Server Actions

`getTranslations()` reads locale from request headers automatically:
- `src/app/(auth)/_actions/auth.ts` — 5 error/validation messages
- `src/app/(app)/settings/_actions/accounts.ts` — 10+ error/validation messages

### 10. Update metadata
In `src/app/layout.tsx` `generateMetadata()`, use `getTranslations('metadata')` for title and description.

---

## What This Does NOT Include
- URL-based locale routing (intentionally skipped)
- Locale switcher UI (deferred — add when a second language is ready)
- Additional language files (add `messages/fr.json` etc. when translations are available)
- Translation of email content (user data, not UI strings)
- PWA manifest translation (deferred)

---

## Files Created / Modified

| File | Action |
|------|--------|
| `messages/en.json` | Create — all ~120 English strings |
| `src/i18n/routing.ts` | Create |
| `src/i18n/request.ts` | Create |
| `next.config.ts` | Modify — wrap with `createNextIntlPlugin` |
| `src/middleware.ts` | Modify — chain next-intl middleware |
| `src/app/layout.tsx` | Modify — locale + `NextIntlClientProvider` |
| `src/app/(app)/_components/sidebar.tsx` | Modify — `useTranslations()` |
| `src/app/(app)/settings/_components/account-form.tsx` | Modify — `useTranslations()` |
| `src/app/(app)/settings/_components/accounts-list.tsx` | Modify — `useTranslations()` |
| `src/app/(auth)/login/_components/login-form.tsx` | Modify — `useTranslations()` |
| `src/app/(auth)/register/_components/register-form.tsx` | Modify — `useTranslations()` |
| `src/app/(app)/settings/page.tsx` | Modify — `getTranslations()` |
| `src/app/(app)/inbox/page.tsx` | Modify — `getTranslations()` |
| `src/app/(auth)/_actions/auth.ts` | Modify — `getTranslations()` |
| `src/app/(app)/settings/_actions/accounts.ts` | Modify — `getTranslations()` |

---

## Verification

1. `npm run dev` starts without errors
2. All pages render correctly with no missing strings
3. `npm run build` succeeds with zero TypeScript errors
4. Playwright e2e tests pass (auth + settings flows unchanged)
5. Smoke test: temporarily add `messages/fr.json` with a couple of translated strings and verify they appear
