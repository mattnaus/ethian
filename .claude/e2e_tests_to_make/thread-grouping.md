# E2E Tests: Thread/Conversation Grouping

## 1. Inbox thread collapse

**Scenario:** Multiple emails with the same `threadId` collapse into a single row with a count badge.

**Steps:**
1. Seed the DB with a user, a mail account, and 3 emails sharing the same `threadId` (category: `inbox`).
2. Navigate to `/inbox`.
3. Assert only 1 email card is rendered for that thread.
4. Assert the card displays a badge with the number "3".
5. Assert the subject, sender, and date match the most recent email in the thread.

**Expected outcome:** One row per thread; badge shows correct count; unread state propagates (if any message is unread, the row appears unread).

## 2. Email detail thread rendering

**Scenario:** Opening a threaded email shows all messages in conversation order.

**Steps:**
1. Seed the DB with 3 emails in the same thread (different senders/bodies), category `inbox`.
2. Navigate to `/inbox` and click the thread row.
3. Assert 3 `MessageBlock` sections are rendered.
4. Assert messages are ordered oldest-first (ascending `sentAt`).
5. Assert the thread count label reads "3 messages".
6. Assert separators are present between messages.

**Expected outcome:** Full conversation rendered with correct order, count label, and separators.

## 3. Single-message (null threadId) fallback

**Scenario:** An email with `threadId = null` renders as a single-message detail view.

**Steps:**
1. Seed the DB with 1 email where `threadId` is null, category `inbox`.
2. Navigate to `/inbox` and click the email card.
3. Assert 1 message block is rendered.
4. Assert no thread count label is shown.
5. Assert the email body and attachments (if any) are displayed.

**Expected outcome:** Single message renders correctly without thread UI chrome.
