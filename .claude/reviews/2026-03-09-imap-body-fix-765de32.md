# Review: IMAP body fetching fix — `765de32`

**Date:** 2026-03-09
**Commits reviewed:** `765de32`
**Files reviewed:**
- `src/lib/imap/client.ts`
- `package.json`
- `package-lock.json`

---

## Summary

The fix correctly identifies and resolves a real protocol violation: `"text"` and `"html"` are not valid IMAP `BODY[<section>]` identifiers, so the previous `bodyParts` approach would have caused every sync job to fail with a server `BAD` response. Replacing it with `source: true` plus `mailparser`'s `simpleParser` is a sound architectural decision — mailparser is the standard library for this purpose and handles multipart/alternative, charset conversion, and header parsing reliably. The `syncMailbox` path is now substantially cleaner. However, `fetchEmailBody` — the other fetch path in the same file — was not updated and still uses the broken `bodyParts: ["text", "html"]` pattern. That function will continue to fail at runtime for the same reason that motivated this fix. There are also several TypeScript correctness issues and a memory concern worth addressing.

---

## Critical Issues

### `fetchEmailBody` still uses the broken `bodyParts: ["text", "html"]`
**File:** `src/lib/imap/client.ts:315`
**Problem:** `fetchEmailBody` (lines 293–370) was not updated as part of this fix. It still passes `bodyParts: ["text", "html"]` to `client.fetch`, which is the exact same invalid IMAP section identifier that caused the `Command failed` errors in `syncMailbox`. Any call to `fetchEmailBody` — used when the detail view loads a full email body — will throw on every real IMAP server. The commit message says the `bodyParts` approach causes the server to return `BAD`; that is equally true here.
**Fix:** Replace the `bodyParts` + `headers` fetch in `fetchEmailBody` with `source: true`, then pipe `message.source` through `simpleParser` to extract `text`, `html`, and headers — exactly as `syncMailbox` now does.

### Unsafe cast of `message.source` to `Buffer`
**File:** `src/lib/imap/client.ts:208`
**Problem:** `message.source` is typed by imapflow as `Buffer | undefined`. The cast `message.source as Buffer` silently passes `undefined` to `simpleParser` if the server does not return a source (e.g., a message with no body, or a server that ignores the `source` fetch option). `simpleParser` accepts `string | Buffer | Readable` — passing `undefined` will cause a runtime throw that is caught by the per-message try/catch and recorded as an error, but the failure mode is invisible without a preceding guard.
**Fix:** Add an explicit guard before calling `simpleParser`:
```typescript
if (!message.source) {
  errors.push({ uid: message.uid, error: "No source returned" });
  continue;
}
const parsed = await simpleParser(message.source);
```

---

## Warnings

### `references` header extracted from flat headers map instead of `parsed.references`
**File:** `src/lib/imap/client.ts:220–223`
**Problem:** `simpleParser` exposes `parsed.references` as a `string[]` directly (already split and cleaned). The new code instead reads `headersMap["references"]`, which is the raw header string value after being stringified through `String(value)` in the `forEach` callback. This re-introduces the need for `parseReferences()` on what may now be an already-stringified structured value rather than the raw RFC 2822 header text. `parsed.inReplyTo` is used correctly (line 219); `parsed.references` should be used the same way and would make `parseReferences` redundant for this path.
**Fix:** Replace lines 220–223 and 242 with:
```typescript
const references = (parsed.references ?? []).map(String);
// ...
references: references,
```

### `headersMap` stringifies structured mailparser values, losing type fidelity
**File:** `src/lib/imap/client.ts:215–217`
**Problem:** `parsed.headers` is a `Map<string, HeaderValue>` where values can be `Date`, `AddressObject`, `MimeWordDecoded[]`, or plain strings. The `String(value)` call on a `Date` gives `"Mon Mar 09 2026 ..."` and on an `AddressObject` gives `"[object Object]"`. The resulting `headersMap` stored in the DB will contain garbage for structured header types. The old manual header parser had the same problem with raw bytes, so this is not a regression from the previous behaviour, but the new code creates an expectation of usefulness.
**Fix:** Either store only the raw headers string (`parsed.headerLines` or re-fetch just the headers) or narrow the forEach to only include headers that are string or string[]. At minimum, document that the stored `headersMap` is a lossy stringification.

### Large message memory pressure: `source: true` fetches entire message body into memory per worker
**File:** `src/lib/imap/client.ts:190–198`
**Problem:** `source: true` downloads the full RFC 2822 message source for every email in the sync window. For accounts with large attachments this could be many megabytes per message, held in memory simultaneously across all concurrently-running sync jobs (`WORKER_CONCURRENCY` defaults to 5). The previous `bodyParts` approach was intended (if broken) to fetch only text/html parts. `simpleParser` supports a `Readable` stream, and imapflow can return `source` as a stream rather than a buffer, which would bound memory.
**Fix:** This is a known trade-off of the `source: true` approach rather than a correctness bug, but it should be documented with a `// TODO` comment noting that large attachments will be downloaded during sync and discarded. Consider passing the stream directly to `simpleParser` rather than buffering the whole source.

---

## Suggestions

### `buildSnippet` uses `html` as fallback, producing tag-stripped content
**File:** `src/lib/imap/client.ts:86`
**Note:** `buildSnippet` takes `(html, text)` and falls back to `html ?? ""` when `text` is absent, then strips tags. The argument order at line 247 passes `(bodyHtml, bodyText)`, matching the function signature. This is correct but the parameter names in the function (`html`, `text`) would be less confusing if the signature were `(text, html)` to match the mental model of "prefer text". Not a bug, just a readability concern.

### `internalDate` is already a `Date` in imapflow — the `new Date()` wrap is redundant but harmless
**File:** `src/lib/imap/client.ts:249–250`
**Note:** imapflow types `message.internalDate` as `Date | undefined`. The `new Date(message.internalDate)` call wraps an already-constructed `Date` in another `Date` constructor call, which works correctly since `new Date(date)` copies the timestamp. It is unnecessary; `message.internalDate ?? new Date()` is sufficient.

---

## README

No. This change fixes an internal IMAP implementation detail. It adds `mailparser` as a dependency, but `mailparser` requires no environment variables, no setup steps, and is fully transparent to operators. The README does not need updating.

---

## E2E tests to add

None. This is a server-side IMAP sync fix with no user-visible flow, form, redirect, or UI state change. The existing sync e2e coverage (or lack thereof) is unchanged by this commit.
