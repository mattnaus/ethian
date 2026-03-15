# E2E Tests: Snooze & Trash

## 1. Snooze an email from detail view
**Scenario:** User snoozes an email from the inbox detail view.
**Steps:**
1. Seed an inbox email for the test user.
2. Navigate to `/inbox/[emailId]`.
3. Click the snooze (clock) icon in the header.
4. Select "Tomorrow morning" from the preset list.
5. Verify a success toast appears.
6. Navigate to `/inbox` — verify the email is no longer in the list.
7. Navigate to `/snoozed` — verify the email appears with a wake-up time.
**Expected outcome:** Email is hidden from inbox and visible in snoozed list with correct wake time.

## 2. Unsnooze from snoozed list
**Scenario:** User unsnoozes an email from the snoozed list.
**Steps:**
1. Seed an email with `snoozedUntil` set to a future date.
2. Navigate to `/snoozed`.
3. Verify the email card appears with the unsnooze button.
4. Click the unsnooze button.
5. Verify the card is removed from the snoozed list (optimistic update).
6. Navigate to `/inbox` — verify the email reappears.
**Expected outcome:** Email returns to its original section after unsnoozing.

## 3. Trash list view and restore
**Scenario:** User views trashed emails and restores one.
**Steps:**
1. Seed an email with `category: "trash"`.
2. Navigate to `/trash`.
3. Verify the email card appears with a restore button.
4. Click the restore button.
5. Verify a success toast appears and the card is removed.
6. Navigate to `/inbox` — verify the email appears.
**Expected outcome:** Restored email moves from trash to inbox.

## 4. Trash detail view
**Scenario:** User views a trashed email's detail page.
**Steps:**
1. Seed an email with `category: "trash"`, body content, and an attachment.
2. Navigate to `/trash`.
3. Click the email card to open `/trash/[emailId]`.
4. Verify the detail view renders: subject, sender, body, attachments, move-to menu, snooze menu.
5. Verify the back button navigates to `/trash`.
**Expected outcome:** Trash detail page renders correctly with all actions available.
