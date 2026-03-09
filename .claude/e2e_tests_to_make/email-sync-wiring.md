# E2E / Integration tests: email sync wiring

Related commit: `f9c701e`

---

## Test 1: Emails appear immediately after adding a mail account

**Scenario:** After a user adds a valid mail account, emails should become visible in the inbox without waiting for the 5-minute repeatable sync interval.

**Steps:**
1. Start the application and worker process with a test IMAP server (e.g. GreenMail or a Docker imapflow fixture pre-seeded with 3 emails).
2. Authenticate as a test user.
3. Navigate to Settings → Accounts.
4. Submit the Add Account form with valid IMAP/SMTP credentials pointing at the test server.
5. Observe the accounts list — the account should appear with status "idle".
6. Navigate to the Inbox view (without waiting more than 30 seconds).

**Expected outcome:**
- The 3 pre-seeded emails are visible in the inbox.
- No manual trigger or waiting for the 5-minute interval is required.
- The `mail_accounts.lastSyncedAt` column is set to a non-null value.

---

## Test 2: No further syncs fire after account deletion

**Scenario:** After a user deletes a mail account, the repeatable BullMQ job for that account should be removed and no further sync jobs should execute.

**Steps:**
1. Add a mail account (as above) and confirm the repeatable job exists in Redis (`emailSyncQueue.getRepeatableJobs()`).
2. Delete the account via Settings → Accounts → Delete.
3. Inspect Redis / BullMQ for repeatable jobs with key `periodic-sync-{accountId}`.
4. Wait 6 minutes (one full interval past deletion).

**Expected outcome:**
- The repeatable job entry is removed from Redis immediately after deletion.
- No new `sync-account` jobs appear in the queue for the deleted account during the 6-minute observation window.
- The `mail_accounts` row no longer exists in the DB.

---

## Test 3: Failed Redis connection does not block account add or delete

**Scenario:** If Redis is unreachable, adding and deleting accounts should still succeed — only the sync scheduling should fail silently with a server-side log.

**Steps:**
1. Bring Redis offline (stop the container / block the port).
2. Attempt to add a mail account with valid credentials.
3. Attempt to delete an existing mail account.

**Expected outcome:**
- Both actions return success to the user (account appears in / disappears from the settings list).
- No error is surfaced to the user in the UI.
- Server logs contain `[addMailAccount] Failed to schedule sync for ...` and `[deleteMailAccount] Failed to cancel sync for ...` entries.
