# E2E Tests: Email Detail View

## 1. Navigate to email detail from inbox

**Scenario:** User clicks an email card in the inbox list and sees the detail view.
**Steps:**
1. Log in as a test user with at least one synced email in the inbox.
2. Navigate to `/inbox`.
3. Click the first email card.
4. Verify URL changed to `/inbox/{emailId}`.
5. Verify the detail view renders: subject heading is visible, sender name is visible, email body text is visible.

**Expected outcome:** Detail view loads with correct email content.

## 2. Back navigation from detail view

**Scenario:** User navigates back from the detail view to the inbox list.
**Steps:**
1. Navigate to `/inbox/{emailId}` (a known email).
2. Click the back button (ArrowLeft icon button).
3. Verify URL returns to `/inbox`.
4. Verify the inbox list is visible.

**Expected outcome:** User returns to the inbox list.

## 3. Mark as read on view

**Scenario:** Viewing an unread email marks it as read.
**Steps:**
1. Ensure a test email exists with `isRead = false`.
2. Navigate to `/inbox/{emailId}`.
3. Wait for the page to load.
4. Query the database to verify `isRead` is now `true` for that email.

**Expected outcome:** The email's `isRead` flag is `true` after viewing.

## 4. 404 for invalid email ID

**Scenario:** Navigating to a non-existent email ID shows a 404 page.
**Steps:**
1. Log in as a test user.
2. Navigate to `/inbox/00000000-0000-0000-0000-000000000000`.
3. Verify the page shows a 404 or "not found" state.

**Expected outcome:** 404 page is displayed, no server error.
