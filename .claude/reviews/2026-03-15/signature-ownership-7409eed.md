# Review: Signature Ownership Checks + Shared Helper — `7409eed`

**Date:** 2026-03-15
**Commits reviewed:** `7409eed0`
**Files reviewed:**
- `src/lib/signatures.ts`
- `src/app/(app)/compose/_actions/compose.ts`
- `src/app/(app)/drafts/[draftId]/_actions/draft.ts`
- `src/app/(app)/inbox/[emailId]/_actions/draft.ts`
- `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx`

---

## Summary

Clean, focused fix that addresses the two Critical ownership issues from the previous review. The new `src/lib/signatures.ts` helper extracts duplicated logic into well-scoped, reusable functions. All save paths now validate signature ownership before persisting, and all send-from-draft paths scope the signature fetch by userId. The reply-box fix correctly restores null signatureId. Build passes with zero errors.

---

## Critical Issues

None.

---

## Warnings

None.

---

## Suggestions

### Consider caching the validated signatureId for save+send within the same request
**File:** `src/lib/signatures.ts`
**Note:** Both `validateSignatureOwnership` and `appendSignatureToBody` issue separate DB queries against the `signatures` table with nearly identical WHERE clauses. In the save path this is fine (only validation runs), but if a future flow calls both in sequence, two queries hit the DB for the same signature. Not a problem today -- just something to be aware of if the two are ever chained.

---

## README

No. This change is an internal security fix with no impact on setup, architecture, env vars, or user-facing behaviour.

---

## E2E tests to add

None. The ownership checks are server-side authorization logic that cannot be meaningfully tested via browser-based e2e tests without a multi-user setup. Unit/integration tests would be the appropriate layer.
