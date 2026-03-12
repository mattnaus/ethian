# Review: Email Detail View — `96c0936`

**Date:** 2026-03-12
**Commits reviewed:** `96c09360`
**Files reviewed:**
- `src/app/(app)/inbox/[emailId]/page.tsx`
- `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`
- `src/app/(app)/inbox/_components/email-card.tsx`
- `messages/en.json`
- `DESIGN.md`

---

## Summary

Solid implementation of the email detail view. The server component correctly scopes the query to the authenticated user, the mark-as-read is non-blocking, and HTML body rendering avoids `dangerouslySetInnerHTML`. The main concern is a security issue with the `emailId` parameter being passed directly into a SQL query without UUID validation — a malformed ID could cause unexpected DB errors or, depending on the ORM's behavior, unintended query behavior. There are also a few responsiveness and touch-target issues on mobile, and the detail view uses hardcoded zinc classes rather than the OKLCH semantic tokens that DESIGN.md prescribes for new screens.

---

## Critical Issues

### 1. `emailId` parameter not validated as UUID before DB query
**File:** `src/app/(app)/inbox/[emailId]/page.tsx:14`
**Problem:** The `emailId` from the URL params is passed directly into `eq(emails.id, emailId)`. The `emails.id` column is `uuid`. If an attacker sends a non-UUID string (e.g. `/inbox/../../something` or SQL-like payloads), Drizzle will forward it to PostgreSQL which will reject it with a type error — but this results in an unhandled 500 error rather than a clean 404. More importantly, there is no validation that this is a well-formed UUID, and relying on the database to reject bad input is a defense-in-depth failure.
**Fix:** Validate `emailId` against a UUID regex before querying. Return `notFound()` if it fails:
```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(emailId)) notFound();
```

---

## Warnings

### 1. Fire-and-forget DB update has no error logging
**File:** `src/app/(app)/inbox/[emailId]/page.tsx:67-73`
**Problem:** The mark-as-read update catches and silently discards errors. If this consistently fails (e.g. connection pool exhaustion, schema mismatch), there is no signal. A database write failing silently in production makes debugging harder.
**Fix:** Log the error in the catch handler:
```ts
.catch((err) => {
  console.error("[mark-as-read] failed for email", emailId, err);
});
```

### 2. `row.sentAt` will throw if null despite schema saying `notNull`
**File:** `src/app/(app)/inbox/[emailId]/page.tsx:80`
**Problem:** `row.sentAt.toISOString()` assumes `sentAt` is a non-null `Date`. The schema defines it as `notNull()`, so this is safe at the DB level. However, the TypeScript type for `row` is inferred from the `.select()` shape and Drizzle will give `Date` (not `Date | null`), so this is technically fine — but if the schema ever changes or a migration is incomplete, this will throw. Low risk but worth noting.
**Fix:** No action required immediately, but a defensive `row.sentAt?.toISOString() ?? new Date().toISOString()` would be more resilient.

### 3. Back button touch target is only 32x32px on mobile
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:96`
**Problem:** The back button is `h-8 w-8` (32x32px). CLAUDE.md and DESIGN.md require minimum 44x44px touch targets on mobile. This is a common tap target for navigation on the detail view, making it a usability issue on touch devices.
**Fix:** Use `h-8 w-8` visually but add `min-h-11 min-w-11` or use padding to ensure the tappable area meets 44px. Alternatively, use `h-11 w-11` on mobile and `md:h-8 md:w-8` on desktop.

### 4. Reply compose bar not accounting for mobile bottom tab bar or safe area
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:162-184`
**Problem:** The reply compose bar is at the bottom of the `flex flex-col h-full` layout. On mobile, the app shell has a fixed bottom tab bar (`pb-16`) and iOS safe area insets. The detail view's `h-full` layout with its own bottom-docked reply bar will overlap with or be hidden behind the tab bar. The compose bar also lacks `pb-safe` or `env(safe-area-inset-bottom)` padding for iOS standalone mode.
**Fix:** Add `pb-16 md:pb-0` to the outer container or the reply bar on mobile. Also add safe area padding: `pb-[calc(env(safe-area-inset-bottom)+1rem)]` on the reply bar for iOS standalone mode. Alternatively, ensure the app shell's `main` element scrolling accounts for the detail view's fixed-height layout.

### 5. New screen uses hardcoded zinc classes instead of OKLCH semantic tokens
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx` (throughout)
**Problem:** DESIGN.md explicitly states: "Do not introduce new zinc hardcodes in new screens; use tokens instead." The detail view uses `text-zinc-50`, `text-zinc-200`, `text-zinc-400`, `text-zinc-500`, `bg-zinc-800`, `bg-zinc-900`, `border-zinc-800`, `border-zinc-700` throughout. This is a new screen and should use `text-foreground`, `text-muted-foreground`, `bg-secondary`, `bg-card`, `border-border`, etc.
**Fix:** Replace all hardcoded zinc classes with their semantic token equivalents per the mapping in DESIGN.md.

### 6. `toAddresses` type assumes non-empty array without guard
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:86-88`
**Problem:** `email.toAddresses.map(...)` will work on an empty array (returns `""`), but the `toList && (...)` check on line 133 will render the recipients section with an empty string since `"" && ...` is falsy in JS — actually this is fine. However, the type `Array<{ address: string; name?: string }>` in the component matches the schema, but there's no runtime guard if the JSONB column somehow contains malformed data (e.g. a string instead of array). A `Array.isArray()` check would be defensive.
**Fix:** Add `Array.isArray(email.toAddresses) ? email.toAddresses : []` in the component or in the page before passing to the component.

---

## Suggestions

### 1. Email body HTML rendering will need improvement
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:56-63`
**Note:** The regex-based tag stripping (`bodyHtml.replace(/<[^>]+>/g, " ")`) is a reasonable temporary fallback, but it will produce poor results for complex HTML emails (tables, nested divs, style blocks leaking as visible text). This is noted as a known limitation. When real HTML rendering is added, use a sanitization library (e.g. DOMPurify) with `dangerouslySetInnerHTML` or an iframe sandbox. The current approach is safe from XSS.

### 2. The `tabIndex={0}` on the Link in EmailCard is redundant
**File:** `src/app/(app)/inbox/_components/email-card.tsx:41`
**Note:** `<Link>` renders an `<a>` element which is already focusable by default. The explicit `tabIndex={0}` is unnecessary and can be removed.

### 3. Consider adding `aria-label` to attachment chips
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:37-44`
**Note:** Attachment chips are currently non-interactive (no download action yet). When download is wired, each chip should have an `aria-label` like `"Download {filename} ({size})"`.

### 4. The reply textarea has no `aria-label`
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:168-175`
**Note:** The textarea uses `placeholder` for context but has no `aria-label` or associated `<label>`. Screen readers will not announce its purpose. Add `aria-label={t("replyPlaceholder")}` or similar.

### 5. Send button has no disabled state or click handler
**File:** `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx:177-180`
**Note:** The send button is UI-only as stated in the work log. It should either be `disabled` to signal it's non-functional, or have a `type="button"` to prevent accidental form submission if this is ever wrapped in a form. Currently it has no `type` attribute so it defaults to `type="submit"` in a form context.

---

## README

Does README.md need updating? **No.** This change adds a new view within the existing app structure. It does not introduce new env vars, change setup steps, or alter the architecture.

---

## E2E tests to add

The email detail view introduces these user-visible flows that should have e2e coverage:

1. **Navigate to email detail from inbox** — click an email card, verify the detail view loads with subject, sender, and body visible.
2. **Back navigation** — from detail view, click back button, verify return to inbox list.
3. **Mark as read** — navigate to an unread email, verify it is marked as read after viewing (check DB or visual indicator on return to list).
4. **404 for invalid email ID** — navigate to `/inbox/nonexistent-uuid`, verify 404 page.
