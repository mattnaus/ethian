# Code Review — Mail Account CRUD (commit 49b33b5)

Reviewed files:
- `src/lib/imap/client.ts` — `verifyImapConnection` and supporting code
- `src/app/(app)/settings/_actions/accounts.ts`
- `src/app/(app)/settings/_components/account-form.tsx`
- `src/app/(app)/settings/_components/accounts-list.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/_components/sidebar.tsx`
- `src/app/(app)/layout.tsx`

---

## Summary

The overall structure is solid. Auth is wired at both the layout and page level, ownership checks use `AND (id = ? AND userId = ?)` so IDOR is not trivially exploitable, passwords are encrypted at rest with AES-256-CBC and a per-call random IV, and IMAP connections are always closed in a `finally` block. The main concerns are: a password that is encrypted twice on the add path (wasting one encrypt call and one IMAP round-trip), no SMTP re-verification on update, a silent no-confirmation delete, and a handful of smaller correctness and UX issues.

---

## Critical Issues

### 1. Password encrypted twice on the add path — double encrypt corrupts the stored value

**File:** `src/app/(app)/settings/_actions/accounts.ts`, lines 97–134

During `addMailAccountAction` the password is encrypted once to build the ephemeral `MailAccount` object passed to `verifyImapConnection` (line 109), then encrypted a second time when the record is actually inserted (line 133):

```ts
// verification call — password is encrypted here
encryptedPassword: encrypt(password),   // line 109

// ...then later the insert also encrypts it
encryptedPassword: encrypt(password),   // line 133
```

Both calls receive the raw `password` string, so the DB value is correctly encrypted — but only by luck of the code being symmetric. The real problem is that `verifyImapConnection` receives an already-encrypted string and immediately decrypts it inside `createImapClient` → `decrypt(account.encryptedPassword)`. This round-trip works because `encrypt(password)` is passed to a type that expects an encrypted field, which `decrypt` can undo. However the two `encrypt()` calls are structurally redundant and fragile: if someone later changes the verification path to pass `encryptedPassword: existing.encryptedPassword` (the update path pattern) but forgets to keep the insert consistent, one path will silently store a double-encrypted value that `decrypt` cannot reverse. This is a latent data-loss / authentication-breakage bug.

**Fix:** Pass `encrypt(password)` to a local variable once, use it for both the verification object and the insert:

```ts
const encryptedPassword = encrypt(password);
// pass encryptedPassword to verifyImapConnection object
// pass encryptedPassword to db.insert
```

---

### 2. No SMTP connection verification on update

**File:** `src/app/(app)/settings/_actions/accounts.ts`, lines 144–191

`addMailAccountAction` calls `verifyImapConnection` before saving (and presumably `verifySmtpConnection` is imported but not called — the import exists on line 9 but the function is never invoked in this file). `updateMailAccountAction` does neither IMAP nor SMTP verification. A user can save broken credentials silently; the first sync failure will be the only signal.

More importantly, the `verifySmtpConnection` import on line 9 is dead code as shipped. If it was meant to be called during add, omitting it means SMTP credentials are never validated on any path.

**Fix:** Call both `verifyImapConnection` and `verifySmtpConnection` in `addMailAccountAction` (and in `updateMailAccountAction` when the password changes or host/port fields change).

---

## Warnings

### 3. Delete has no confirmation dialog — one mis-click permanently destroys account data

**File:** `src/app/(app)/settings/_components/accounts-list.tsx`, lines 30–34, 107–116

`handleDelete` fires `deleteMailAccountAction` immediately on button click with no confirmation step. Because `mailAccounts` has `onDelete: "cascade"` in the schema, all synced emails for that account are deleted from the database at the same time. There is no undo.

**Fix:** Show a confirmation dialog (e.g. an `AlertDialog` from shadcn/ui) before calling the server action. Disable the delete button while any transition is pending for *that specific account* (see issue 4 below).

---

### 4. Single `isPending` flag disables all delete buttons when any one delete is in-flight

**File:** `src/app/(app)/settings/_components/accounts-list.tsx`, lines 18, 110–113

`isPending` is shared across all list items. While one account is being deleted every other delete button is also disabled, which is confusing and incorrect for users with multiple accounts.

**Fix:** Track pending state per account ID, e.g. with a `Set<string>` in state, or use an `optimisticUpdate` pattern.

---

### 5. `useActionState` is re-initialised with a new `action` reference on every render in edit mode

**File:** `src/app/(app)/settings/_components/account-form.tsx`, lines 33–37

```ts
const action = isEdit
  ? updateMailAccountAction.bind(null, account.id)
  : addMailAccountAction;

const [state, formAction, isPending] = useActionState(action, initialState);
```

`updateMailAccountAction.bind(null, account.id)` creates a new function reference on every render. React's `useActionState` takes the action only once (on mount); subsequent changes are ignored. However, the stale closure created on mount captures the original `account.id`. If `account` prop is ever changed without unmounting the dialog (e.g. the user opens edit for account A, closes without submitting, then opens for account B while the dialog component is still mounted), the action still submits for account A's ID. The component does reset the form via `formRef.current?.reset()` on close, but it does not force a remount of `AccountForm`, so the stale action binding persists.

**Fix:** Add `key={account?.id ?? "add"}` to `<AccountForm>` at the call site in `accounts-list.tsx` to force a remount whenever the target account changes, which guarantees `useActionState` picks up the correct binding.

---

### 6. IMAP error messages are forwarded verbatim to the client

**File:** `src/app/(app)/settings/_actions/accounts.ts`, line 119
**File:** `src/lib/imap/client.ts`, line 147

```ts
return { error: `IMAP connection failed: ${imapResult.error}` };
```

`imapResult.error` is the raw `Error.message` from imapflow, which can include the hostname, authentication method, server banners, or internal server error strings. Forwarding these strings to the browser is a minor information-disclosure risk and also surfaces unhelpful implementation details to end users.

**Fix:** Log the full error server-side (e.g. `console.error`) and return a sanitised, user-facing message such as "Could not connect to the IMAP server. Check your host, port, and credentials."

---

### 7. `imapPort` and `smtpPort` field errors are silently swallowed

**File:** `src/app/(app)/settings/_components/account-form.tsx`, lines 117–124, 157–165

The `imapPort` and `smtpPort` `<Input>` fields have no error display block (`{field("imapPort") && ...}`), unlike every other validated field. If Zod rejects an out-of-range port number the user sees no inline error.

**Fix:** Add error paragraphs for `imapPort` and `smtpPort` matching the pattern used for all other fields.

---

### 8. Double auth check in settings page — inconsistent session shape comparison

**File:** `src/app/(app)/layout.tsx`, line 12
**File:** `src/app/(app)/settings/page.tsx`, line 8–9

The layout checks `!session?.user` and the page checks `!session?.user?.id`. These guard different things: the layout allows a session with a user object that has no `id` through to the page, where it is then caught. If `auth()` can return `{ user: {} }` (a user object without an id, which NextAuth can produce for OAuth sessions before the `session` callback populates `id`), the page's database query would use `undefined` as the `userId`, potentially returning all accounts with a null user_id or throwing a DB error.

**Fix:** Standardise on `!session?.user?.id` in the layout as the single authoritative auth guard, removing the redundant check in `page.tsx`, or at minimum add the `.id` check to the layout guard.

---

## Suggestions

### S1. `verifyImapConnection` opens a mailbox lock unnecessarily

**File:** `src/lib/imap/client.ts`, lines 142–143

```ts
const lock = await client.getMailboxLock("INBOX");
lock.release();
```

Getting a mailbox lock selects INBOX, which is more expensive than needed for a connectivity check. A plain `client.connect()` already performs the IMAP `LOGIN`/`AUTHENTICATE` exchange; a successful connect is sufficient proof that credentials are valid. Dropping the lock also removes the failure mode where a server with no INBOX causes the verification to report false failure.

---

### S2. `loadKey()` is called on every `encrypt`/`decrypt` invocation

**File:** `src/lib/crypto.ts`, lines 29–47, 59, 79

`loadKey()` reads and validates `process.env.ENCRYPTION_KEY` on every call. For a hot path (e.g. syncing hundreds of messages) this is needless repetition. Cache the result in a module-level constant initialised lazily.

---

### S3. CBC mode without authentication (no MAC)

**File:** `src/lib/crypto.ts`

AES-256-CBC provides confidentiality but not integrity. An attacker who can manipulate the stored `encryptedPassword` column (e.g. via a SQL injection elsewhere) can perform a padding oracle attack or flip bits in the plaintext without detection. AES-256-GCM provides authenticated encryption and is the current recommendation. This is a low-urgency suggestion given the application-layer threat model, but worth noting for future hardening.

---

### S4. Settings link active state is duplicated in sidebar

**File:** `src/app/(app)/_components/sidebar.tsx`, lines 70–84

The active-state logic for the Settings link (`pathname === "/settings" || pathname.startsWith("/settings/")`) is written inline twice: once for the link class and once for the icon class. The NAV_ITEMS pattern above uses a single `active` variable. Extract a `settingsActive` variable or add Settings to `NAV_ITEMS` to eliminate the duplication.

---

### S5. `account-form.tsx` resets the form on close but not on successful submission

**File:** `src/app/(app)/settings/_components/account-form.tsx`, lines 41–45, 47–52

`useEffect` closes the dialog on `state.success`, but the form reset `useEffect` only fires when `open` becomes false. Because the dialog closes first (setting `open = false`), then `useEffect([open])` fires and calls `formRef.current?.reset()`, the reset does happen — but it's an order-dependent side effect. A more explicit approach is to reset directly in the `state.success` effect alongside closing the dialog.

---

### S6. No `aria-label` on icon-only action buttons

**File:** `src/app/(app)/settings/_components/accounts-list.tsx`, lines 98–116

The Edit and Delete buttons contain only an icon. They have `<span className="sr-only">` children which is correct, but the buttons have no `aria-label` attribute. Some screen readers announce the accessible name from `sr-only` content, but adding an explicit `aria-label` is more robust across assistive technologies.
