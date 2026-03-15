# E2E Tests: Draft Detail View

## 1. Navigate to draft detail from drafts list
**Scenario:** User clicks a draft card and sees the draft detail page.
**Steps:**
1. Create a user with a mail account and a draft email (with subject, recipient, body).
2. Navigate to `/drafts`.
3. Click the draft card.
4. Verify URL is `/drafts/{draftId}`.
5. Verify subject, recipient name, and body text are displayed.
6. Verify Edit, Discard, and Send buttons are visible.

## 2. Edit draft from detail view
**Scenario:** Clicking Edit redirects to compose with draft data.
**Steps:**
1. Navigate to `/drafts/{draftId}` for an existing draft.
2. Click the Edit button.
3. Verify URL is `/compose?draft={draftId}`.
4. Verify To, Subject, and Body fields are prepopulated with the draft data.

## 3. Discard draft from detail view
**Scenario:** Clicking Discard deletes the draft and redirects to drafts list.
**Steps:**
1. Navigate to `/drafts/{draftId}` for an existing draft.
2. Click the Discard button.
3. Verify redirect to `/drafts`.
4. Verify the discarded draft no longer appears in the list.

## 4. Save draft redirects to detail view
**Scenario:** Saving a draft from compose redirects to the draft detail page.
**Steps:**
1. Navigate to `/compose`.
2. Fill in a recipient and body text.
3. Click "Save draft".
4. Verify redirect to `/drafts/{newDraftId}`.
5. Verify the draft detail page shows the saved content.
