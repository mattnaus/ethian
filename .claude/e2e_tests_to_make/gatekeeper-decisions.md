# E2E Test Spec: Gatekeeper Approve/Block Decisions

## Prerequisite setup
- Authenticated user with at least one mail account
- At least one screener_queue entry with associated email(s) in `screener` category
- Seed the test DB with a known sender in screener_queue

---

## Test 1: Approve a sender from Gatekeeper

**Scenario:** User clicks Approve on a Gatekeeper entry
**Steps:**
1. Navigate to `/gatekeeper`
2. Verify at least one entry is visible
3. Note the sender address of the first entry
4. Click the "Approve" button on the first entry
5. Wait for the entry to disappear from the list

**Expected:**
- The entry is removed from the Gatekeeper list
- A `sender_rules` row exists with `decision = 'approved'` for that sender
- All emails from that sender are now `category = 'inbox'`
- The screener_queue row for that sender is deleted

---

## Test 2: Block a sender from Gatekeeper

**Scenario:** User clicks Block on a Gatekeeper entry
**Steps:**
1. Navigate to `/gatekeeper`
2. Click the "Block" button on an entry
3. Wait for the entry to disappear

**Expected:**
- Entry removed from list
- `sender_rules` row with `decision = 'blocked'`
- Emails re-categorised to `trash`
- screener_queue row deleted

---

## Test 3: Assign sender to Feed via More menu

**Scenario:** User uses the More popover to assign a sender to Feed
**Steps:**
1. Navigate to `/gatekeeper`
2. Click the More (three dots) button on an entry
3. Click "Feed" in the popover

**Expected:**
- Popover closes
- Entry removed from list
- `sender_rules` row with `decision = 'feed'`
- Emails re-categorised to `feed`

---

## Test 4: Assign sender to Paper Trail via More menu

**Scenario:** User uses the More popover to assign to Paper Trail
**Steps:**
1. Navigate to `/gatekeeper`
2. Click the More button
3. Click "Paper Trail"

**Expected:**
- Entry removed, rule created with `paper_trail`, emails re-categorised

---

## Test 5: Empty state after all decisions

**Scenario:** User processes all Gatekeeper entries
**Steps:**
1. Navigate to `/gatekeeper` with exactly one entry
2. Approve or block that entry

**Expected:**
- Empty state message is displayed: "No unknown senders..."
