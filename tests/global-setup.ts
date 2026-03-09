import { execSync } from "child_process";
import { config } from "dotenv";

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
    const output =
      err instanceof Error && "stdout" in err
        ? (err as NodeJS.ErrnoException & { stdout: Buffer }).stdout?.toString()
        : "";
    console.error("[test setup] drizzle-kit push failed:", output || err);
    throw err;
  }
}
