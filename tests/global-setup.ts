import { execSync } from "child_process";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

export default async function globalSetup() {
  const dbUrl = process.env.DATABASE_URL_TEST;

  if (!dbUrl) {
    throw new Error("DATABASE_URL_TEST must be set in .env.local");
  }

  console.log("[test setup] Pushing schema to test database…");

  try {
    // --force skips the arrow-key confirmation prompt drizzle-kit shows for
    // data-loss statements. Safe here because the test DB is disposable.
    execSync("npx drizzle-kit push --force", {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log("[test setup] Schema ready.");
  } catch (err) {
    const spawnErr = err as NodeJS.ErrnoException & {
      stdout?: Buffer;
      stderr?: Buffer;
    };
    const output = [spawnErr.stdout, spawnErr.stderr]
      .filter(Boolean)
      .map((b) => b!.toString())
      .join("\n");
    console.error("[test setup] drizzle-kit push failed:", output || err);
    throw err;
  }

  // Verify the schema was actually applied — a zero-exit partial push would
  // otherwise be silently accepted and cause confusing test failures.
  const sql = postgres(dbUrl, { max: 1, connect_timeout: 5 });
  try {
    await sql`SELECT 1 FROM users LIMIT 0`;
  } catch {
    throw new Error(
      "[test setup] Schema push reported success but 'users' table not found in test DB"
    );
  } finally {
    await sql.end();
  }
}
