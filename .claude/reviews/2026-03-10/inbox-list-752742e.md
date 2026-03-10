# Review: Inbox email list view — `752742e`

**Date:** 2026-03-10
**Commits reviewed:** `752742e`
**Files reviewed:**
- `src/app/(app)/inbox/page.tsx`
- `src/app/(app)/inbox/_components/email-list.tsx`
- `src/app/(app)/inbox/_components/email-row.tsx`

---

## Summary

Clean, well-structured implementation of the inbox email list. The responsive two-line mobile / single-line desktop layout is solid, color conventions match the design system, and the DB query is efficient with a correlated subquery for attachments. The main concerns are an XSS vector from rendering unsanitized `accountColor` into `style`, a hardcoded locale in date formatting that bypasses the i18n system, and a missing `"use client"` directive needed for `EmailRow` to function as intended in future interactive iterations.

---

## Critical Issues

### XSS via `accountColor` injected into inline `style`
**File:** `src/app/(app)/inbox/_components/email-row.tsx:86`
**Problem:** `email.accountColor` comes from the database (`mailAccounts.color`) and is rendered directly into a `style` attribute: `style={{ backgroundColor: email.accountColor }}`. While React's `style` prop does not execute script (unlike `dangerouslySetInnerHTML`), if the color value were ever set to something unexpected via a compromised DB row or a future API endpoint that writes to `mail_accounts.color`, it could produce unexpected rendering. More importantly, the same pattern applies to `bgColor` from `avatarBgColor()` on line 92, but that one is safe since it selects from a hardcoded array. The `accountColor` value should be validated as a hex color before rendering.
**Fix:** Add a validation guard before rendering:
```ts
const safeColor = /^#[0-9a-fA-F]{6}$/.test(email.accountColor) ? email.accountColor : "#3b82f6";
```
Then use `safeColor` in the style prop. Alternatively, validate at the DB query level or in the Server Action that writes the color.

---

## Warnings

### Hardcoded `"en"` locale in date formatting bypasses i18n
**File:** `src/app/(app)/inbox/_components/email-row.tsx:56-61`
**Problem:** `formatDate()` passes `"en"` to `toLocaleTimeString` and `toLocaleDateString`. The rest of the app uses next-intl for localization. When additional locales are added, dates will remain in English.
**Fix:** Accept a locale parameter in `formatDate()` and pass it from the component, or use next-intl's `useFormatter()` / `format.dateTime()` to format dates consistently with the app's locale.

### No pagination or virtualization for large inboxes
**File:** `src/app/(app)/inbox/page.tsx:46`
**Problem:** The query uses `.limit(100)` with no pagination mechanism. Users with more than 100 inbox emails silently lose visibility of older messages. There is no "load more" button, no cursor-based pagination, and no infinite scroll. Additionally, rendering 100 rows without virtualization may cause jank on low-end mobile devices.
**Fix:** Add cursor-based pagination (e.g., keyset pagination on `sentAt` + `id`). At minimum, add a visible indicator when there are more emails beyond the displayed 100. Virtualization (e.g., `react-window`) can be deferred but should be planned for.

### `sentAt` is a `Date` object passed from Server Component to Client Component
**File:** `src/app/(app)/inbox/page.tsx:55` and `src/app/(app)/inbox/_components/email-row.tsx:10`
**Problem:** `EmailList` and `EmailRow` are not marked `"use client"`, so they currently render as Server Components, which is fine. However, `sentAt: Date` in the `InboxEmail` type will break if either component becomes a Client Component in the future (e.g., to add click handlers, selection state, or keyboard navigation). Next.js serializes props across the server/client boundary, and `Date` objects are not serializable — they arrive as strings. The type would silently lie, and `formatDate()` would receive a string instead of a `Date`.
**Fix:** Either (a) serialize `sentAt` to an ISO string in `page.tsx` and parse it in the component, or (b) add a comment explicitly documenting that these components must remain Server Components. Option (a) is safer for the inevitable future where interactivity is added.

### Desktop subject column has a fixed `max-w-[280px]` that may truncate short subjects unnecessarily
**File:** `src/app/(app)/inbox/_components/email-row.tsx:144`
**Problem:** `max-w-[280px]` is a fixed pixel width on the subject, which violates the convention of avoiding fixed pixel widths. On a narrow desktop window (1024px with sidebar open), the sender column (`w-40` = 160px) plus this 280px subject plus gaps and padding may consume most of the row, leaving little room for the snippet. On very wide screens, the 280px cap wastes space.
**Fix:** Use a percentage or `max-w-[40%]` instead, or remove the cap and let `shrink-0` handle truncation naturally with the flex layout. Alternatively, use `shrink` with a minimum width so the subject flexes with the available space.

### `email_attachments` table referenced in raw SQL without schema import
**File:** `src/app/(app)/inbox/page.tsx:32-35`
**Problem:** The `hasAttachments` subquery uses a raw SQL string referencing `email_attachments` by table name. If the table is ever renamed in the Drizzle schema, this raw SQL will silently break at runtime. Drizzle cannot type-check or refactor-track raw SQL table names.
**Fix:** Import `emailAttachments` from the schema and use Drizzle's `exists()` + subquery builder if possible. If raw SQL is necessary, add a comment noting the hard dependency on the `email_attachments` table name.

---

## Suggestions

### Account color dot is very small (6px) and may be hard to distinguish
**File:** `src/app/(app)/inbox/_components/email-row.tsx:85`
**Note:** The `h-1.5 w-1.5` dot (6x6px) is subtle, which may be intentional for a minimal design. But on high-DPI mobile screens, 6 CSS pixels is barely visible. Consider `h-2 w-2` (8x8px) if user testing shows it is too hard to see.

### `EmailRow` has no keyboard or screen reader affordance
**File:** `src/app/(app)/inbox/_components/email-row.tsx:74`
**Note:** The row is a plain `<div>` with `cursor-default`. It has no `role`, `tabIndex`, or `onClick`. When email detail view is wired up, this will need to become a focusable, clickable element (likely a `<Link>` or `<button>`). Not a problem now since there is no detail view, but worth noting for the next iteration.

### `getInitials` does not handle empty string edge case
**File:** `src/app/(app)/inbox/_components/email-row.tsx:39-48`
**Note:** If `fromAddress` is an empty string (theoretically not possible given the `notNull` constraint, but defensive code is better), `email[0]` would be `undefined` and `.toUpperCase()` would throw. Add a fallback like `return email[0]?.toUpperCase() ?? "?"`.

---

## README

Does README.md need updating? No. The inbox list view is a UI feature built on existing infrastructure (DB schema, auth, mail accounts). It does not introduce new env vars, setup steps, or architectural changes. The README already lists inbox as a planned view. A changelog entry could be nice but is not required.

---

## E2E tests to add

The inbox email list is a new user-visible flow that should have e2e coverage. Specifically:

1. **Empty inbox state** — authenticated user with no emails sees the empty message.
2. **Inbox with emails** — seed test emails in the DB, verify the list renders sender names, subjects, and dates.
3. **Unread vs read styling** — verify unread emails have bold sender name and read emails have muted styling.

These tests require DB seeding of `emails` and `mail_accounts` rows, which is a new test helper capability.
