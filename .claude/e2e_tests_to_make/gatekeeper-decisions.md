# E2E Tests: Gatekeeper Approve/Block Decisions

## Test 1: Approve a sender from the Gatekeeper

**Scenario:** A logged-in user with a screener queue entry clicks Approve and the entry is removed.

**Setup:**
- Registered user with a mail account
- At least one `screener_queue` entry linked to an email in the `emails` table

**Steps:**
1. Navigate to `/gatekeeper`
2. Verify at least one sender entry is visible
3. Click the "Approve" button on the first entry
4. Wait for the entry to be removed from the list

**Expected outcome:**
- The entry disappears from the Gatekeeper list
- A `sender_rules` row exists with `decision = 'approved'` for that sender address
- The linked email's `category` is updated to `'inbox'`
- The `screener_queue` entry is deleted

---

## Test 2: Block a sender from the Gatekeeper

**Scenario:** A logged-in user clicks Block on a screener entry.

**Setup:**
- Same as Test 1

**Steps:**
1. Navigate to `/gatekeeper`
2. Click the "Block" button on the first entry
3. Wait for the entry to be removed from the list

**Expected outcome:**
- The entry disappears from the Gatekeeper list
- A `sender_rules` row exists with `decision = 'blocked'` for that sender address
- The linked email's `category` is updated to `'trash'`
- The `screener_queue` entry is deleted

---

## Test 3: Gatekeeper empty state

**Scenario:** A logged-in user with no screener queue entries sees the empty state.

**Setup:**
- Registered user with no `screener_queue` entries

**Steps:**
1. Navigate to `/gatekeeper`

**Expected outcome:**
- The empty state message is displayed: "No unknown senders. Everyone here is either approved or blocked."
- No email cards or approve/block buttons are visible
