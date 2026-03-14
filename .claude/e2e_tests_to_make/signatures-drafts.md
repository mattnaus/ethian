# E2E Test Specs: Signatures & Drafts

## 1. Signature CRUD in Settings

**Scenario:** User manages email signatures from the Settings page.

**Steps:**
1. Log in and navigate to `/settings`.
2. Verify "Signatures" section is visible with empty state.
3. Click "Add signature" button — dialog opens.
4. Fill in name and content, check "Set as default", submit.
5. Verify signature appears in the list with "Default" badge.
6. Click edit (pencil icon) on the signature — dialog opens with pre-filled values.
7. Change the name, uncheck default, save.
8. Verify updated name appears, "Default" badge is removed.
9. Click delete (trash icon), confirm the dialog.
10. Verify signature is removed from the list, empty state returns.

**Expected outcome:** Full CRUD lifecycle works; default badge logic is correct; form validation prevents empty submissions.

---

## 2. Reply Box Signature Strip

**Scenario:** When composing a reply, the default signature appears and can be changed or dismissed.

**Steps:**
1. Create a default signature in Settings.
2. Navigate to an email detail page (`/inbox/[emailId]`).
3. Verify the signature strip appears below the reply textarea showing the default signature content.
4. Click the dismiss (X) button on the signature strip.
5. Verify the signature strip disappears.
6. (If multiple signatures exist) Re-open, verify ChevronDown picker lists all signatures.
7. Select a different signature — verify the strip updates.
8. Type a reply and send — verify the signature is appended to the sent message body.

**Expected outcome:** Signature strip reflects the active signature; dismiss removes it; picker switches between signatures; signature is included in sent text.

---

## 3. Draft Lifecycle

**Scenario:** User saves, edits, and discards a draft reply.

**Steps:**
1. Navigate to an email detail page.
2. Type reply text in the ReplyBox.
3. Click "Save draft" — verify toast "Draft saved" appears.
4. Verify a DraftBubble appears in the thread with dashed border and "Draft" label.
5. Click "Edit" on the DraftBubble — verify the text loads into the ReplyBox textarea.
6. Modify the text, click "Save draft" again — verify it updates (no duplicate DraftBubble).
7. Click "Discard" on the DraftBubble, confirm — verify the DraftBubble is removed.
8. Alternatively: click "Send" on the DraftBubble — verify it converts to a sent MessageBubble.

**Expected outcome:** Draft save creates/updates a draft row; DraftBubble renders with correct actions; discard removes it; send converts it to a sent message.
