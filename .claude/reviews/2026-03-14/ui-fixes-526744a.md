# Review: Reply box & scrollbar UI fixes — `526744a`

**Date:** 2026-03-14
**Commits reviewed:** `f9b9951`, `182cc70`, `2c49a6a`, `47d7ab3`, `526744a`
**Files reviewed:** `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx`, `src/app/(app)/inbox/[emailId]/_components/email-detail-view.tsx`, `src/app/globals.css`

---

## Summary

Five small UI/UX fixes: signature strip behavior, reply box max-width alignment, and thread scrollbar hiding. The build passes cleanly. The changes are low-risk and well-scoped. One pre-existing bug was found in the reply-box send flow (signature computed before the empty-check guard). The scrollbar-none CSS approach is correct and the revert of `2c49a6a` in `47d7ab3` was clean. No work log entries exist for these commits.

---

## Critical Issues

None.

---

## Warnings

### Signature is computed before the empty-reply guard, wasting work and risking sending signature-only messages
**File:** `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx:88-90`
**Problem:** `handleSend()` calls `buildBodyWithSignature(reply.trim())` on line 89, then checks `if (!reply.trim() || isSending) return;` on line 90. If the reply is empty but a signature is active, `text` will be `"\n\n--\nSignature content"` — a non-empty string. While the guard still exits because `reply.trim()` is empty, the `text` variable is computed unnecessarily. More importantly, if this guard is ever refactored to check `text` instead of `reply.trim()`, it would allow sending a message that is only a signature with no actual content.
**Fix:** Move the guard before the `buildBodyWithSignature` call:
```ts
async function handleSend() {
  if (!reply.trim() || isSending) return;
  const text = buildBodyWithSignature(reply.trim());
  setIsSending(true);
  // ...
}
```

### No work log entries for these commits
**File:** `.claude/work/20260314.md`
**Problem:** The five commits `f9b9951` through `526744a` have no corresponding entries in the work log. The convention requires every commit to be documented.
**Fix:** Add entries for each commit (or a combined entry for the batch) to `.claude/work/20260314.md`.

---

## Suggestions

### Empty signature strip shows blank space when no signature is active
**File:** `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx:181-254`
**Note:** When `signatures.length > 0` but `activeSignatureId` is null, the signature strip renders with an empty `<p>` element (`activeSignature?.content ?? ""`). This shows a visible but empty row with just the chevron button. This is intentional per the work log ("the strip stays visible whenever signatures exist, so the picker remains accessible"), but the empty paragraph takes up vertical space for no informational value. Consider showing a placeholder like "No signature" or reducing the strip height when no signature is active.

### `px-[10px]` is a magic number
**File:** `src/app/(app)/inbox/[emailId]/_components/reply-box.tsx:157`
**Note:** `px-[10px]` is an arbitrary value that doesn't correspond to a standard Tailwind spacing value. The closest standard values are `px-2.5` (10px) which is identical. Using `px-2.5` would be more idiomatic. This also appears in `email-detail-view.tsx:412`. Both should match, and both could use `px-2.5`.

### Commit `2c49a6a` was introduced and reverted in the same batch
**Note:** Commit `2c49a6a` ("move thread scrollbar to viewport right edge") was reverted by `47d7ab3`. While the final state is correct, the intermediate commit adds noise to the git history. For future similar explorations, consider using `git commit --fixup` or squashing before pushing.

---

## README

Does README.md need updating? No. These are minor UI tweaks to existing functionality with no impact on setup, architecture, env vars, or user-facing behavior documentation.

---

## E2E tests to add

None. These are visual/CSS-only changes (scrollbar hiding, max-width alignment) and a minor state management simplification (signature dismissed state removal). The existing reply/draft flows are not functionally changed.
