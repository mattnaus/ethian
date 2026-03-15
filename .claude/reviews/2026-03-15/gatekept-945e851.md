# Review: Gatekept sender rules management page — `945e851`

**Date:** 2026-03-15
**Commits reviewed:** `945e851b`
**Files reviewed:**
- `messages/en.json`
- `src/app/(app)/_components/sidebar.tsx`
- `src/app/(app)/_components/mobile-nav-context.tsx`
- `src/app/(app)/gatekept/_actions/rules.ts`
- `src/app/(app)/gatekept/page.tsx`
- `src/app/(app)/gatekept/_components/gatekept-list.tsx`
- `src/app/(app)/gatekept/_components/gatekept-card.tsx`

---

## Summary

Solid implementation overall. The page follows established patterns well — the error handling in client components matches the reference `handleDecision()` pattern (try/catch/finally, toast on failure, pending state cleared in finally). Server actions return typed result objects and never throw. The build passes cleanly. The main concerns are a SQL injection vector in the `like()` call, a hardcoded English string in the footer, and missing `try/catch` around the transaction in `updateSenderRuleDecision`.

---

## Critical Issues

### SQL injection via LIKE pattern in `updateSenderRuleDecision`
**File:** `src/app/(app)/gatekept/_actions/rules.ts:71`
**Problem:** The `fromDomain` value from the database is interpolated directly into a `like()` pattern: `` like(emails.fromAddress, `%@${rule.fromDomain}`) ``. While `rule.fromDomain` comes from the DB (not direct user input), it was originally user-supplied when the sender rule was created. If `fromDomain` contains LIKE wildcards (`%`, `_`), it matches more rows than intended, potentially re-categorizing emails belonging to other senders. For example, a domain of `%` would match every email address. This is not classic SQL injection (Drizzle parameterizes the value), but it is a **LIKE pattern injection** that can cause unintended data modification across all user accounts.
**Fix:** Escape LIKE wildcards before interpolation:
```ts
function escapeLike(value: string): string {
  return value.replace(/%/g, "\\%").replace(/_/g, "\\_");
}
// then:
like(emails.fromAddress, `%@${escapeLike(rule.fromDomain)}`)
```
This same pattern exists in `sync.worker.ts` and the gatekeeper decision action — fix all instances consistently.

---

## Warnings

### Server action `updateSenderRuleDecision` does not catch transaction errors
**File:** `src/app/(app)/gatekept/_actions/rules.ts:39-78`
**Problem:** The `db.transaction()` call on line 39 is not wrapped in `try/catch`. If the transaction throws (e.g., DB connection drop, serialization failure), the unhandled rejection propagates to the client as a generic 500 error instead of the typed `{ success: false }` result. The convention in CLAUDE.md states server actions "must never throw to the client."
**Fix:** Wrap lines 39-82 in a try/catch that returns `{ success: false, error: "..." }`.

### Hardcoded English string in "Showing X of Y" footer
**File:** `src/app/(app)/gatekept/_components/gatekept-list.tsx:301-303`
**Problem:** The string `` `Showing ${rules.length} of ${total}` `` is hardcoded in English. All user-visible strings must come from `messages/en.json` via `t()`.
**Fix:** Add a `showingOf` key to `pages.gatekept` in `messages/en.json` (e.g., `"showingOf": "Showing {shown} of {total}"`) and use `t("showingOf", { shown: rules.length, total })`, matching the pattern used in `gatekeeper-list.tsx:359`.

### `deleteSenderRule` does not re-categorize orphaned emails
**File:** `src/app/(app)/gatekept/_actions/rules.ts:87-108`
**Problem:** When a sender rule is deleted, the emails previously categorized by that rule remain in their current category (e.g., inbox, feed). The delete confirmation text says "Future emails from this sender will go to the Gatekeeper again" which is correct for future emails, but it may be surprising that existing emails stay categorized. This is documented in the UI string `deleteConfirmDescription`, so the user is informed — but there is no option to also move existing emails back to screener. This is a design decision worth flagging.
**Fix:** No code change required if the current behavior is intentional. If re-categorization is desired, add a `recategorize` boolean parameter to the action.

---

## Suggestions

### Desktop filter tab buttons lack focus-visible styles
**File:** `src/app/(app)/gatekept/_components/gatekept-list.tsx:192-207`
**Note:** The filter tab buttons use `<button>` elements but have no `focus-visible:` ring. Add `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none` for keyboard accessibility.

### `SerializedSenderRule.decision` and `appliesTo` are typed as `string`
**File:** `src/app/(app)/gatekept/page.tsx:22-23`
**Note:** These could be narrowed to union types (`"approved" | "blocked" | "feed" | "paper_trail"` and `"address" | "domain"`) to get compile-time safety in the client components and avoid the `as DecisionKey` casts in `gatekept-card.tsx:125,129`.

### Popover option button extracts text color via string splitting
**File:** `src/app/(app)/gatekept/_components/gatekept-card.tsx:144`
**Note:** `DECISION_STYLES[d].split(" ").find((c) => c.startsWith("text-"))` is fragile — it breaks if the class order changes or if Tailwind merges classes differently. Define a separate `DECISION_TEXT_COLORS` map instead.

### No pagination — the page loads up to 200 rules in one query
**File:** `src/app/(app)/gatekept/page.tsx:10`
**Note:** `GATEKEPT_LIMIT = 200` is reasonable for now, but for users with many rules, cursor-based pagination or a "load more" button would be better. Low priority unless the limit is routinely hit.

---

## README

Does README.md need updating? No. This is a new internal management page that does not affect setup, environment variables, or architecture. The existing sidebar description in CLAUDE.md already covers the navigation structure.

---

## E2E tests to add

The Gatekept page introduces several new user-visible flows that should have e2e coverage:

1. **View sender rules list** — navigate to `/gatekept`, verify rules are displayed grouped by decision type.
2. **Filter rules by decision type** — click filter tabs, verify list updates correctly.
3. **Search rules** — type in search input, verify filtering works.
4. **Change a rule's decision** — click decision badge, select new decision from popover, verify the badge updates and toast does not appear (success case).
5. **Delete a rule** — click delete button, confirm in AlertDialog, verify the rule is removed from the list.
6. **Empty state** — with no rules, verify the empty state message is shown.
