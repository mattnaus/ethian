# E2E Tests: Feed, Saved, and Move-to

## Feed list view

**Scenario:** User navigates to Feed page and sees feed emails
**Steps:**
1. Log in and seed DB with emails having `category: "feed"` for the test user
2. Navigate to `/feed`
3. Verify the page title "Feed" is visible
4. Verify feed emails appear in the list with sender name, subject, and date
5. Verify search filters the list by sender/subject
6. If no feed emails exist, verify the empty state message appears

## Saved list view

**Scenario:** User navigates to Saved page and sees paper_trail emails
**Steps:**
1. Log in and seed DB with emails having `category: "paper_trail"` for the test user
2. Navigate to `/saved`
3. Verify the page title "Saved" is visible
4. Verify saved emails appear in the list
5. Verify empty state when no paper_trail emails exist

## Move-to action from inbox

**Scenario:** User moves an inbox email to Feed
**Steps:**
1. Log in, seed an email with `category: "inbox"`
2. Navigate to `/inbox/[emailId]`
3. Click "Move to" button
4. Select "Move to Feed"
5. Choose "Just this message"
6. Verify success toast appears
7. Verify redirect to `/inbox`
8. Navigate to `/feed` and verify the email now appears there

## Move-to with sender rule

**Scenario:** User moves an email and applies to future emails
**Steps:**
1. Log in, seed an email with `category: "inbox"`
2. Navigate to `/inbox/[emailId]`
3. Click "Move to" > "Move to Feed" > "Also future emails"
4. Verify success toast
5. Verify a sender rule was created in the DB with decision "feed"

## Read-only detail view

**Scenario:** User opens a feed email detail page
**Steps:**
1. Log in, seed a feed email with body content and attachments
2. Navigate to `/feed`
3. Click on the email card
4. Verify URL is `/feed/[emailId]`
5. Verify sender name, subject, date, and body are displayed
6. Verify "Back" button navigates to `/feed`
7. Verify "Move to" menu is present and shows options (excluding Feed since it's the current category)
