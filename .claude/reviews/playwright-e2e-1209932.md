# Code Review: Playwright e2e framework (`1209932`)

## Critical (must fix)

**`tests/global-setup.ts` line 18 — stderr not surfaced on failure**
`stdio: ['pipe', 'pipe', 'pipe']` captures all output but only `stdout` is logged in the error branch. drizzle-kit typically writes failure output to stderr, so the error message would be empty. Should also capture and log `stderr`.

**`tests/global-setup.ts` — `drizzle-kit push --force` is non-transactional**
A zero-exit-code partial push would be silently accepted. No verification step (e.g., a `SELECT 1` or table existence check) confirms the push succeeded. Acceptable for a disposable test DB, but worth noting.

**`tests/helpers/auth.ts` lines 21–26 and 38–43 — `page.evaluate` DOM mutation race**
Removing `required`/`minLength` via `evaluate` before `page.click` is async-safe in practice (awaited before click), but if React reconciles between the evaluate and the click, attributes could be restored. More importantly, for the short-password test, this makes the test not representative of real user behaviour (real users would see the browser's native validation, not the server error).

---

## Important (should fix)

**`playwright.config.ts` line 32 — `trace: "on-first-retry"` is useless with `retries: 0`**
Traces are never recorded because there are no retries. Change to `"retain-on-failure"` to capture traces for failing tests.

**`tests/auth.spec.ts` — page cookies not cleared in `beforeEach`**
`beforeEach` deletes the DB user but doesn't clear browser cookies. Tests share browser context by default, so a prior logged-in test could leave a session cookie interfering with the next test. Should call `page.context().clearCookies()` in `beforeEach` (currently only done manually in some tests).

**`tests/helpers/db.ts` — singleton client may be closed prematurely across spec files**
`closeDb()` is called in `afterAll` of both `auth.spec.ts` and `settings.spec.ts`. Whichever runs first closes the pool; subsequent DB calls in the other file's `beforeEach` silently re-open it. Harmless but fragile.

**`tests/settings.spec.ts` lines 13–20 — IMAP env vars read at module load time**
`process.env.TEST_IMAP_*` are captured into the `IMAP` object when the module loads. If undefined, `IMAP.password` becomes `""` which would be filled into forms if `test.skip` guard somehow fails. Low risk but structure relies on `test.skip` always being first line of each IMAP test.

---

## Minor (nice to have)

- `playwright.config.ts`: consider adding `expect: { timeout: 10_000 }` for consistent slower-server tolerance
- `playwright.config.ts`: no `globalTeardown` (establishes pattern for future use)
- `playwright.config.ts`: using dev server for tests is slow; `next build && next start` would be more stable
- `tests/helpers/auth.ts`: helpers return `void` with no assertions — failures manifest at the call site with less context
- `tests/auth.spec.ts`: error text assertions use exact strings; consider `data-testid` for resilience to copy changes
- `tests/helpers/db.ts`: `deleteUser` is a no-op if user doesn't exist; a debug log would surface teardown issues

---

## Notes

- `.invalid` TLD is correct RFC 2606 approach — good.
- `reuseExistingServer: false` is correct and important.
- Serial execution is pragmatic; long-term path is per-test DB isolation for parallelism.
- `--force` on `drizzle-kit push` is acceptable and documented.
