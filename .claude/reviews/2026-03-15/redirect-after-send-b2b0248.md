# Review: Redirect to conversation after send — `b2b0248`

**Date:** 2026-03-15
**Commits reviewed:** `b2b02483`
**Files reviewed:**
- `src/app/(app)/compose/_components/compose-view.tsx`
- `src/app/(app)/drafts/[draftId]/_components/draft-detail-view.tsx`
- `src/app/(app)/compose/_actions/compose.ts` (return type context)
- `src/app/(app)/drafts/[draftId]/_actions/draft.ts` (return type context)
- `src/app/(app)/inbox/[emailId]/page.tsx` (destination page)

---

## Summary

Small, focused two-line change that replaces post-send navigation (`router.back()` / `router.push("/drafts")`) with `router.push(`/inbox/${result.sentEmailId}`)` in both compose and standalone draft views. The build passes cleanly. The change has one notable robustness issue around `sentEmailId` potentially being an empty string, which would navigate to `/inbox/` (likely a 404 or unexpected page). Otherwise the change is correct and well-scoped.

---

## Critical Issues

None.

---

## Warnings

### Empty `sentEmailId` causes navigation to `/inbox/`
**File:** `src/app/(app)/compose/_actions/compose.ts:252`
**Problem:** In `sendNewEmailAction`, `sentEmailId` is set to `insertedId ?? ""`. If the DB insert fails (caught on line 225), the code falls through to the "partial" return on line 237 — so an empty string would only happen if `inserted` is somehow undefined without throwing. However, the fallback to `""` means the type system does not prevent navigating to `/inbox/` (no UUID), which would hit `notFound()` in the inbox page (the UUID regex check on line 19 of the page catches it). This is not a crash, but the user would see a 404 after successfully sending an email.
**Fix:** Guard against empty `sentEmailId` in both client components before navigating. Fallback to `/sent` or `/inbox` list:
```ts
if (result.success === true) {
  router.push(result.sentEmailId ? `/inbox/${result.sentEmailId}` : "/sent");
}
```
Alternatively, tighten the server action to never return an empty string for `sentEmailId` when `success` is `true`.

---

## Suggestions

### "Partial" success still navigates to previous page / `/drafts`
**File:** `src/app/(app)/compose/_components/compose-view.tsx:198`, `src/app/(app)/drafts/[draftId]/_components/draft-detail-view.tsx:91`
**Note:** The "partial" branch (email sent via SMTP but DB insert failed) still uses `router.back()` and `router.push("/drafts")` respectively. This is reasonable since there is no `sentEmailId` to navigate to, but it creates an inconsistent UX: the user is told the email was sent but lands on a page that does not show it. Consider navigating to `/sent` in this case so the user at least lands in the right context.

---

## README

Does README.md need updating? No. This is a minor UX navigation change with no impact on setup, architecture, or env vars.

---

## E2E tests to add

None. The send flow already involves SMTP infrastructure that is not available in e2e tests. The navigation change is a one-line redirect swap and does not introduce a new user-visible flow that warrants a separate test spec.
