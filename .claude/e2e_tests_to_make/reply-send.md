# E2E Test: Reply Send Flow

## Scenario: User sends a reply from the email detail view

### Preconditions
- Authenticated user with at least one mail account
- At least one email in the inbox with a valid thread

### Steps
1. Navigate to `/inbox/{emailId}` for an existing email
2. Verify the compose bar is visible at the bottom
3. Type a message in the reply textarea
4. Click the Send button
5. Verify the optimistic message bubble appears immediately in the thread
6. Verify the send button is disabled while sending
7. Verify the textarea is cleared after send

### Expected Outcome
- A new message bubble appears in the chat view with the typed text
- The bubble is right-aligned (self bubble style)
- The thread scrolls to the bottom smoothly

## Scenario: Cmd/Ctrl+Enter keyboard shortcut sends reply

### Steps
1. Navigate to an email detail view
2. Type a message in the reply textarea
3. Press Cmd+Enter (macOS) or Ctrl+Enter (other platforms)

### Expected Outcome
- The reply is sent (same behaviour as clicking Send)

## Scenario: Send failure shows error and rolls back

### Preconditions
- SMTP send is mocked to fail

### Steps
1. Navigate to an email detail view
2. Type a message and submit
3. The server action returns `{ success: false, error: "..." }`

### Expected Outcome
- The optimistic message bubble is removed from the thread
- The typed text is restored in the textarea
- An error message appears below the compose bar in red text
- The error message disappears when the user starts typing again or retries

## Scenario: Empty reply cannot be sent

### Steps
1. Navigate to an email detail view
2. Verify the Send button is disabled when textarea is empty
3. Type only whitespace
4. Verify the Send button remains disabled

### Expected Outcome
- No action is triggered; no network request is made
