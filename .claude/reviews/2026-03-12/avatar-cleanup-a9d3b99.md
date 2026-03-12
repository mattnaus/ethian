# Review: Avatar cleanup & subject shrink fix — `a9d3b99`

**Date:** 2026-03-12
**Commits reviewed:** `a9d3b994`
**Files reviewed:** `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx`, `src/app/(app)/inbox/_components/email-card.tsx`, `src/lib/email-display.ts`, `DESIGN.md`

---

## Summary

Clean dead-code removal of `AVATAR_COLORS` and `avatarBgColor`. The subject `shrink min-w-0` fix is correct and will prevent overflow at narrow viewports while respecting the `max-w-[45%]` cap. Two issues remain: the gatekeeper avatar lost its background but gained no ring, leaving initials floating on a transparent background with poor contrast; and DESIGN.md has two stale references to the deleted hash-color avatar backgrounds.

---

## Critical Issues

None.

---

## Warnings

### Gatekeeper avatar has no visual container (no ring, no background)
**File:** `src/app/(app)/gatekeeper/_components/gatekeeper-row.tsx:48`
**Problem:** The commit removed `style={{ backgroundColor: bgColor }}` from the gatekeeper avatar but did not add an account-color ring (`boxShadow`) to replace it. The inbox `email-card.tsx` avatar uses `style={{ boxShadow: \`0 0 0 2px ${ringColor}\` }}` to give the circle a visible boundary. The gatekeeper avatar is now white initials on a fully transparent background against a `bg-zinc-900` card -- there is no circle visible at all. Initials like "M" or "I" will appear to float with no affordance indicating they are an avatar.
**Fix:** Add the same account-color ring to the gatekeeper avatar:
```tsx
<div
  className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white select-none"
  style={{ boxShadow: `0 0 0 2px ${dotColor}` }}
>
```

### DESIGN.md "Special-Purpose Colors" still references deleted avatar hash colors
**File:** `DESIGN.md:57`
**Problem:** Line 57 reads: "Avatar backgrounds: Hash-derived from sender email address -- 8 fixed colors (...). See `src/lib/email-display.ts`." This function no longer exists. The Avatars section (line 237) was correctly updated to say "transparent", but this earlier reference was missed.
**Fix:** Replace line 57 with: `- **Avatar backgrounds**: Transparent — no background color. Initials are white text over the card background.` or remove the bullet entirely since the Avatars section already covers this.

### DESIGN.md "Gatekeeper Row" pattern still says "hash color bg"
**File:** `DESIGN.md:154`
**Problem:** Line 154 says the gatekeeper row left side contains `h-8 w-8 avatar (hash color bg)`. The avatar no longer has a hash-derived background color.
**Fix:** Update to reflect the current state (transparent background, with or without ring depending on whether the ring fix above is applied).

---

## Suggestions

### Work log entry for this commit is missing
**File:** `.claude/work/20260312.md`
**Note:** The work log for 2026-03-12 does not contain an entry for commit `a9d3b99`. Per convention, every commit should have a corresponding work log entry documenting the request, plan, and changes.

---

## README

Does README.md need updating? No. This change is purely cosmetic (avatar styling and dead code removal) with no impact on setup, architecture, or env vars.

---

## E2E tests to add

None. The changes are visual refinements to existing rendered components (avatar styling, flex-shrink behavior). No new user flows, forms, redirects, or error states were introduced.
