# E2E Tests: Inbox Email List

## Prerequisites

These tests require a new test helper to seed `mail_accounts` and `emails` rows in the test database. The existing `tests/helpers/` directory has auth and DB helpers but no email/account seeding.

---

## Test 1: Empty inbox shows empty message

**Scenario:** Authenticated user with no mail accounts (or no inbox-category emails) visits `/inbox`.

**Steps:**
1. Register and log in via the existing auth helper.
2. Navigate to `/inbox`.
3. Assert the page contains the empty state message ("Your inbox is empty").

**Expected outcome:** The empty state paragraph is visible. No email rows are rendered.

---

## Test 2: Inbox renders email rows with correct data

**Scenario:** Authenticated user with seeded inbox emails visits `/inbox`.

**Steps:**
1. Register and log in.
2. Seed a `mail_accounts` row for the test user (with known color, e.g. `#3b82f6`).
3. Seed 3 `emails` rows with `category: "inbox"`, varying `fromName`, `subject`, `snippet`, `isRead`, and `sentAt` values.
4. Navigate to `/inbox`.
5. Assert 3 email rows are visible.
6. Assert each row displays the correct sender name (or fromAddress if fromName is null).
7. Assert each row displays the subject text.

**Expected outcome:** All three seeded emails appear in the list in descending date order with correct sender and subject.

---

## Test 3: Unread vs read email styling

**Scenario:** Inbox contains both read and unread emails.

**Steps:**
1. Register, log in, seed account and emails (1 read, 1 unread).
2. Navigate to `/inbox`.
3. For the unread email row, assert the sender name element has `font-semibold` styling (or check computed font-weight is 600+).
4. For the read email row, assert the sender name element has `font-normal` or muted color.

**Expected outcome:** Unread emails are visually distinct from read emails via text weight and color.

---

## Test 4: Attachment indicator appears when email has attachments

**Scenario:** Inbox contains an email with a non-inline attachment.

**Steps:**
1. Register, log in, seed account, seed 1 email, seed 1 `email_attachments` row with `content_id: NULL` for that email.
2. Navigate to `/inbox`.
3. Assert a paperclip icon (or element with `aria-label="Has attachment"`) is visible in that row.

**Expected outcome:** The paperclip indicator is rendered for the email with attachments.
