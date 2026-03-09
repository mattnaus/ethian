/**
 * Test DB helpers — direct Postgres access for setup/teardown.
 * Uses DATABASE_URL_TEST, which is loaded into process.env by the Playwright
 * config (via dotenv) before any test code runs.
 */

import postgres from "postgres";

let _client: ReturnType<typeof postgres> | undefined;

function getClient() {
  if (!_client) {
    if (!process.env.DATABASE_URL_TEST) {
      throw new Error("DATABASE_URL_TEST is not set");
    }
    _client = postgres(process.env.DATABASE_URL_TEST, { max: 1 });
  }
  return _client;
}

/** Delete a user by email (cascades to mail_accounts, emails, etc.) */
export async function deleteUser(email: string) {
  const sql = getClient();
  await sql`DELETE FROM users WHERE email = ${email}`;
}

/** Close the DB connection pool. Call in afterAll. */
export async function closeDb() {
  if (_client) {
    await _client.end();
    _client = undefined;
  }
}
