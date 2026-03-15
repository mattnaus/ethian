# E2E Tests: Gatekept Page

## 1. Page loads and displays sender rules

**Scenario:** User navigates to the Gatekept page and sees their sender rules.
**Steps:**
1. Log in as a test user with pre-seeded sender rules (at least one of each decision type).
2. Navigate to `/gatekept`.
3. Verify the page title "Gatekept" is visible.
4. Verify sender rules are displayed with correct decision badges (color-coded).
5. Verify the rule count indicator matches the number of visible rules.

**Expected outcome:** All sender rules for the user are listed, grouped by decision type when "All" filter is active.

## 2. Filter tabs filter rules by decision type

**Scenario:** User clicks filter tabs to narrow displayed rules.
**Steps:**
1. Navigate to `/gatekept` with pre-seeded rules of multiple decision types.
2. Click "Approved" filter tab.
3. Verify only approved rules are shown.
4. Click "Blocked" filter tab.
5. Verify only blocked rules are shown.
6. Click "All" tab.
7. Verify all rules are shown again with group dividers.

**Expected outcome:** Each filter tab correctly narrows the displayed rules.

## 3. Search filters rules by sender name/address/domain

**Scenario:** User searches for a specific sender.
**Steps:**
1. Navigate to `/gatekept` with multiple pre-seeded rules.
2. Type a known sender name or email fragment into the search input.
3. Verify only matching rules are displayed.
4. Clear the search input.
5. Verify all rules reappear.

**Expected outcome:** Search correctly filters rules in real time.

## 4. Change decision via Popover

**Scenario:** User changes a rule's decision from the card.
**Steps:**
1. Navigate to `/gatekept` with at least one "approved" rule.
2. Click the "Approved" decision badge on a rule card.
3. Verify the Popover shows the other decision options (Feed, Paper Trail, Blocked).
4. Click "Feed".
5. Verify the badge updates to "Feed" with the correct color.
6. Reload the page and verify the change persisted.

**Expected outcome:** Decision is updated both in the UI and in the database.

## 5. Delete rule via AlertDialog

**Scenario:** User deletes a sender rule.
**Steps:**
1. Navigate to `/gatekept` with at least one rule.
2. Click the delete (trash) icon on a rule card.
3. Verify the AlertDialog confirmation appears with title and description.
4. Click "Cancel" and verify the rule is still present.
5. Click delete again, then click "Delete" to confirm.
6. Verify the rule is removed from the list.
7. Reload the page and verify the rule is gone.

**Expected outcome:** Rule is permanently deleted after confirmation.
