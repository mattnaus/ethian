# Review: Mailbox filter dropdown fix — `a154575`

**Date:** 2026-03-12
**Commits reviewed:** `a1545754`
**Files reviewed:** `src/app/(app)/inbox/_components/inbox-view.tsx`

---

## Summary

Solid structural fix. Extracting `MailboxFilterContent` and `FolderSwitcherContent` from nested function components to module-level components is the correct solution for the Popover remounting problem — React was treating them as new component types on every render. The `emailCounts` Map and tinted active state are clean additions. A few i18n and minor typing issues below, but nothing blocking.

---

## Critical Issues

None.

---

## Warnings

### Hardcoded "Accounts" heading in MailboxFilterContent
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:118`
**Problem:** The string `Accounts` is hardcoded in the JSX instead of going through `useTranslations()`. This violates the i18n convention in CLAUDE.md ("Never hardcode UI strings in components"). It will not be translatable if a second locale is added.
**Fix:** Either pass a translated label string as a prop from `InboxView` (where `useTranslations` is available), or call `useTranslations` inside `MailboxFilterContent` directly.

### Hardcoded "Gatekeeper:" and "new senders" in top bar (pre-existing)
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:277-281, 343-347`
**Problem:** The Gatekeeper button text ("Gatekeeper:", "new senders") is hardcoded in both the desktop and mobile top bars. This is pre-existing (not introduced by this commit) but worth noting since a `gatekeeperButton` i18n key already exists in `messages/en.json` that handles pluralisation.
**Fix:** Use `t("gatekeeperButton", { count: screenerCount })` for the label text and `t("gatekeeperLabel")` (or similar) for "Gatekeeper:".

---

## Suggestions

### `getFolderLabel` uses a type assertion union instead of deriving from FOLDERS
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:260`
**Problem:** The cast `id as "inbox" | "feed" | "paperTrail" | "gatekeeper" | "setAside" | "replyLater"` duplicates the folder IDs already defined in the `FOLDERS` constant. If a folder is added or renamed in `FOLDERS`, this union must be updated manually or TypeScript will not catch the mismatch.
**Fix:** Derive the type from `FOLDERS`:
```ts
type FolderId = (typeof FOLDERS)[number]["id"];
```
Then use `id as FolderId` or, better, type the `getLabel` prop as `(id: FolderId) => string` so the cast is unnecessary.

### `FolderSwitcherContent` always highlights "inbox" as active
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:171`
**Problem:** The active folder is hardcoded as `id === "inbox"`. This is fine while the component only lives on the inbox page, but if the folder switcher is reused on other pages (feed, paper trail), the active state will be wrong.
**Fix:** Accept an `activeFolderId` prop. Low priority since reuse is not happening yet.

### `emailCounts` counts all emails, not just inbox-category emails
**File:** `src/app/(app)/inbox/_components/inbox-view.tsx:218-224`
**Problem:** The count is derived from the `emails` prop which is already filtered to inbox-category on the server, so this is correct today. But the naming (`emailCounts`) is generic enough that a future reader might assume it counts all emails across categories. A comment or more specific name (e.g. `inboxCountsByAccount`) would clarify intent.
**Fix:** Rename to `inboxCountsByAccount` or add a brief comment. Very minor.

---

## README

Does README.md need updating? No. This is a UI bugfix to an existing component with no new env vars, setup steps, or architectural changes.

---

## E2E tests to add

None. The mailbox filter is an interactive client-side filter on an existing view. The core inbox list rendering is already covered by existing flows. A dedicated e2e test for the popover open/close and account filtering behaviour would be useful but is not strictly warranted by this small fix alone.
