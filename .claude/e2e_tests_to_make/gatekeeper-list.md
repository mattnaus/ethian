# E2E Test Spec: Gatekeeper List View

## Test 1: Gatekeeper page loads and shows empty state

**Scenario:** Authenticated user with no screener queue entries visits /gatekeeper.

**Steps:**
1. Log in as test user (no mail accounts or with accounts but zero screener entries).
2. Navigate to `/gatekeeper`.

**Expected outcome:**
- Page title is "Gatekeeper".
- Empty state message is visible: "No unknown senders. Everyone here is either approved or blocked."
- No row elements are rendered.

---

## Test 2: Gatekeeper page displays sender rows

**Scenario:** Authenticated user with screener queue entries visits /gatekeeper.

**Prerequisites:** Seed the test DB with a user, a mail account, at least one email, and 2-3 `screener_queue` rows with varying `messageCount` and `lastSeenAt` values.

**Steps:**
1. Log in as seeded test user.
2. Navigate to `/gatekeeper`.

**Expected outcome:**
- Rows are rendered in descending order by `lastSeenAt`.
- Each row shows: account color dot, avatar with initials, sender name (or email if no name), domain, message count label (pluralized correctly: "1 email" vs "3 emails"), formatted date.
- The page header reads "Gatekeeper".

---

## Test 3: Sidebar navigation to Gatekeeper

**Scenario:** User clicks the Gatekeeper link in the sidebar.

**Steps:**
1. Log in as test user.
2. On desktop viewport, click "Gatekeeper" in the sidebar.
3. On mobile viewport, tap "Gatekeeper" in the bottom tab bar.

**Expected outcome:**
- URL changes to `/gatekeeper`.
- The nav item shows active state (orange icon).
