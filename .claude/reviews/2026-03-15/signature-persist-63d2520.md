# Review: Persist Signature Choice on Drafts — `63d2520`

**Date:** 2026-03-15
**Commits reviewed:** `63d2520`
**Files reviewed:**
- `src/db/schema/emails.ts`
- `drizzle/0004_chief_hawkeye.sql`
- `src/app/(app)/compose/_actions/compose.ts`
- `src/app/(app)/compose/_components/compose-view.tsx`
- `src/app/(app)/compose/page.tsx`
- `src/app/(app)/drafts/[draftId]/_actions/draft.ts`
- `src/app/(app)/inbox/[emailId]/_actions/draft.ts`
- `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`
- `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx`
- `src/app/(app)/inbox/[emailId]/page.tsx`

---

## Summary

Solid feature implementation that adds a `signatureId` FK to the `emails` table and threads it through save, edit, and send paths for both standalone compose and in-thread reply drafts. The schema change is clean, the migration is correct, and the build passes with zero errors. Two security issues exist around signature ownership validation, and there is a logic bug where editing a draft saved with "no signature" incorrectly restores the default signature.

---

## Critical Issues

### Signature fetched at send time without ownership check
**File:** `src/app/(app)/drafts/[draftId]/_actions/draft.ts:133-140`
**File:** `src/app/(app)/inbox/[emailId]/_actions/draft.ts:235-242`
**Problem:** When sending a draft, the signature content is fetched using only `eq(signatures.id, draft.signatureId)` with no `eq(signatures.userId, userId)` filter. A user could store another user's `signatureId` in a draft (via the save action, which also lacks this check) and have that signature's content appended to their outgoing email. This leaks another user's signature content.
**Fix:** Add `eq(signatures.userId, userId)` to the WHERE clause in both `sendStandaloneDraftAction` and `sendDraftAction` signature queries:
```ts
.where(and(eq(signatures.id, draft.signatureId), eq(signatures.userId, userId)))
```

### Signature ID stored without ownership validation on save
**File:** `src/app/(app)/compose/_actions/compose.ts:107`
**File:** `src/app/(app)/compose/_actions/compose.ts:132`
**File:** `src/app/(app)/inbox/[emailId]/_actions/draft.ts:94`
**File:** `src/app/(app)/inbox/[emailId]/_actions/draft.ts:123`
**Problem:** The `signatureId` from the client payload is stored directly into the `emails` row without verifying that the signature belongs to the authenticated user. While the FK constraint ensures it must be a valid signature ID, it could reference another user's signature. Combined with the send-time fetch issue above, this enables cross-user signature content exfiltration.
**Fix:** Before storing, validate ownership. Either: (a) add a check query `SELECT 1 FROM signatures WHERE id = signatureId AND userId = userId`, or (b) if `signatureId` is provided, verify it exists in the user's signatures before INSERT/UPDATE. A helper function shared across all save actions would reduce duplication.

---

## Warnings

### Editing a draft with no signature incorrectly restores the default
**File:** `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx:75`
**Problem:** The condition `if (editingDraft.signatureId !== null)` means that when a draft was explicitly saved with no signature (`signatureId: null`), editing it does not reset `activeSignatureId` to `null`. The user sees the default signature reappear instead of "no signature" as they chose. The `undefined` vs `null` distinction matters here: `null` means "user chose no signature" while `undefined` means "no preference stored".
**Fix:** Change the condition to always set the signature when editing a draft:
```ts
if (editingDraft) {
  setReply(editingDraft.bodyText);
  setCurrentDraftId(editingDraft.id);
  setActiveSignatureId(editingDraft.signatureId);
  onEditingDraftClear();
  setTimeout(() => textareaRef.current?.focus(), 0);
}
```

---

## Suggestions

### Sent email snippet includes signature text
**File:** `src/app/(app)/drafts/[draftId]/_actions/draft.ts:179`
**File:** `src/app/(app)/inbox/[emailId]/_actions/draft.ts:285`
**Note:** After appending the signature to `bodyText`, the snippet is computed as `bodyText.slice(0, 200)`. For long signatures, the snippet in list views will show signature boilerplate instead of the actual message content. Consider computing the snippet from the original body text before signature appending.

### Consider a shared helper for signature fetch-and-append
**File:** `src/app/(app)/drafts/[draftId]/_actions/draft.ts:132-141`
**File:** `src/app/(app)/inbox/[emailId]/_actions/draft.ts:234-243`
**Note:** The signature fetch + append logic is duplicated identically across two files. A shared utility (e.g., `appendSignatureToBody(bodyText, signatureId, userId)`) would reduce duplication and make it easier to apply the ownership fix consistently.

---

## README

Does README.md need updating? No. This is an internal schema addition (nullable FK column) with no new env vars, setup steps, or user-facing architecture changes.

---

## E2E tests to add

None. The signature persistence is an enhancement to existing compose/draft flows. The existing e2e coverage for drafts and sending should be extended to cover signature selection, but that is tracked separately.
