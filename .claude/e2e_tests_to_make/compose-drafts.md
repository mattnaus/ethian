# E2E Tests: Compose & Drafts

## 1. Compose — send a new email

**Scenario:** User composes and sends a new email.
**Preconditions:** User is logged in with at least one mail account configured.
**Steps:**
1. Navigate to `/compose` (or click Compose button in sidebar).
2. Verify the From account selector shows the user's default account.
3. Type a recipient email in the To field, press Enter — verify chip appears.
4. Enter a subject and body text.
5. Click Send.
6. Verify redirect back to previous page.
7. Verify the sent email record exists in the database.

**Expected outcome:** Email is sent via SMTP and recorded in DB with `isSent: true`, `category: "sent"`.

---

## 2. Compose — save and resume a draft

**Scenario:** User saves a compose draft and later resumes editing.
**Steps:**
1. Navigate to `/compose`.
2. Add a recipient, subject, and body text.
3. Click "Save draft" — verify toast confirmation.
4. Navigate to `/drafts`.
5. Verify the draft appears in the list with correct subject and recipient.
6. Click the draft — verify redirect to `/compose?draft={id}`.
7. Verify all fields (To, Subject, Body) are pre-populated with saved values.
8. Modify the body, click "Save draft" again — verify toast.
9. Navigate to `/drafts` — verify updated snippet.

**Expected outcome:** Draft is persisted and can be resumed with all fields intact.

---

## 3. Drafts list — empty state

**Scenario:** User visits /drafts with no compose drafts.
**Steps:**
1. Ensure no compose drafts exist (delete any via DB).
2. Navigate to `/drafts`.
3. Verify the "No drafts yet." empty state message is shown.

**Expected outcome:** Empty state renders correctly with translated message.
