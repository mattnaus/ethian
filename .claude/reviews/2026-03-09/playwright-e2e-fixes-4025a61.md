# Code Review: Playwright e2e fixes (`4025a61`)

Follow-up review after addressing findings from `playwright-e2e-1209932.md`.

## Fixes verified

All 5 previously-flagged issues are implemented correctly:
- `global-setup.ts`: stderr now surfaced on failure (stdout + stderr joined) ✓
- `global-setup.ts`: schema verification via `SELECT 1 FROM users LIMIT 0` ✓
- `helpers/auth.ts`: `form.noValidate = true` replaces per-input attribute removal ✓
- `playwright.config.ts`: `trace: "retain-on-failure"` (was no-op with retries:0) ✓
- `auth.spec.ts` + `settings.spec.ts`: cookies cleared in `beforeEach` ✓
- `settings.spec.ts`: IMAP env vars read inside each test after `test.skip` ✓
- `playwright.config.ts`: `expect: { timeout: 10_000 }` added ✓

---

## Remaining issues

**Minor: `tests/settings.spec.ts` — non-null assertions on IMAP env vars not covered by skip guard**
The `test.skip` guard only checks `TEST_IMAP_HOST`. If `TEST_IMAP_HOST` is set but `TEST_IMAP_USERNAME` / `TEST_IMAP_PASSWORD` are not, the `!` assertions produce `undefined` strings that silently reach the form. Affects both IMAP tests.

**Pre-existing (acknowledged): `tests/helpers/db.ts` — singleton DB client shared across spec files**
Both `afterAll` hooks close the same pool. Harmless with current two-spec structure but fragile. Connection ownership is ambiguous.

**Pre-existing (acknowledged): `helpers/auth.ts` — `noValidate` on login form is unnecessary**
The login form has no constraint validation attributes, so `noValidate` is a no-op there. Harmless, but if a future test expects a native validation tooltip it would be masked.

**Non-issue: `global-setup.ts` — re-thrown error is raw `execSync` error, not formatted string**
The readable output is already logged via `console.error` before re-throw. Playwright's run report will show the raw error, but the human-readable message appears in the console output. Acceptable.

---

## Notes

All critical and important findings from the first review are resolved. Only minor/pre-existing issues remain.
