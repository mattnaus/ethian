# Review: Gatekeeper expandable card preview — `cdc66af`

**Date:** 2026-03-15
**Commits reviewed:** `cdc66af`
**Files reviewed:**
- `src/app/(app)/gatekeeper/_actions/decisions.ts`
- `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx`
- `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx`
- `messages/en.json`
- `src/db/schema/senders.ts` (reference)

---

## Summary

Clean, well-scoped feature. The server action has a proper ownership check, HTML is sanitized with DOMPurify before rendering, preview bodies are cached in a ref to avoid redundant fetches, and all new UI strings are in the messages file. The main concerns are a race condition in `toggleExpand` and the lack of XSS hardening on the DOMPurify call. Build passes cleanly.

---

## Critical Issues

None.

---

## Warnings

### Race condition in `toggleExpand` — rapid clicks can show stale loading/error state for wrong card
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:154-180`
**Problem:** `previewLoading` and `previewError` are scalar booleans shared across all cards, but `expandedId` can change while a fetch is still in-flight. Scenario: user clicks card A (fetch starts, `previewLoading=true`), then quickly clicks card B. `expandedId` switches to B, but when A's fetch completes it sets `previewLoading=false` — card B now shows no loading spinner even though its fetch hasn't started yet (it was cached or not). Worse, if A's fetch errors, `previewError=true` bleeds into card B's display.
**Fix:** Track loading/error state per ID (e.g. `loadingId: string | null` and `errorId: string | null`), or use an abort-on-switch pattern. Simplest fix:
```ts
const [loadingId, setLoadingId] = useState<string | null>(null);
const [errorId, setErrorId] = useState<string | null>(null);
// In toggleExpand:
setLoadingId(id);
// ...
setLoadingId(null); // in finally
setErrorId(id);     // on error
```
Then pass `previewLoading={loadingId === email.id}` and `previewError={errorId === email.id}`.

### DOMPurify.sanitize called without restrictive configuration
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx:182`
**Problem:** `DOMPurify.sanitize(bodyContent)` with no options allows `<form>`, `<iframe>` (with srcdoc), `<meta http-equiv="refresh">`, and `<style>` tags that can break the page layout or phish users (e.g. a form that overlays the approve/block buttons). Malicious email HTML is a realistic threat in a screener context — the user is reviewing emails from *unknown* senders.
**Fix:** Pass a restrictive config:
```ts
DOMPurify.sanitize(bodyContent, {
  FORBID_TAGS: ['style', 'form', 'meta', 'link'],
  FORBID_ATTR: ['style'],
  ADD_ATTR: ['target'],
})
```
This matches common email client sanitization. Consider applying the same config to `read-only-email-view.tsx:336` for consistency.

### Error handling pattern deviation — no toast on preview fetch failure
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-list.tsx:172-176`
**Problem:** The `toggleExpand` function catches errors from `fetchGatekeeperPreview` and sets `previewError` state for inline display, but does not call `toast.error(t("..."))`. The CLAUDE.md convention requires `toast.error` on both `{ success: false }` and caught exceptions for all Server Action calls. While inline error display is arguably better UX for a preview, it deviates from the documented pattern.
**Fix:** Either add `toast.error(t("previewError"))` alongside the inline error state, or document this as an intentional exception to the convention. The inline display alone is reasonable for a read-only fetch, so this is low severity.

---

## Suggestions

### Add `aria-expanded` to the card button
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-card.tsx:67-68`
**Note:** The card has `role="button"` and a chevron indicator, but no `aria-expanded={expanded}` attribute. Screen readers won't know whether the preview panel is open or closed. Add `aria-expanded={expanded}` to the outer `<div>`.

### Consider sanitizing on the server side
**File:** `src/app/(app)/gatekeeper/_actions/decisions.ts:40`
**Note:** Sanitizing HTML client-side means the raw `bodyHtml` (potentially containing malicious markup) is serialized over the Server Action wire protocol and arrives in the browser's JS heap before DOMPurify runs. Sanitizing server-side before returning would reduce the attack surface — if a future refactor accidentally renders the unsanitized value, the damage is already prevented. This is a defense-in-depth suggestion, not a current vulnerability.

---

## README

Does README.md need updating? **No.** This is an internal UI enhancement to an existing page with no new env vars, setup steps, or architectural changes.

---

## E2E tests to add

None. The Gatekeeper triage flow already has e2e coverage. The expandable preview is a progressive enhancement that does not introduce new routes, redirects, or form submissions that warrant dedicated e2e tests. Manual QA is sufficient for the expand/collapse interaction.
