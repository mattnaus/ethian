import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------
// We use the `postgres` npm package which supports connection pooling out of
// the box. In production, set DATABASE_URL to your managed PostgreSQL URL
// (e.g. Neon, Supabase, or a self-hosted instance).
//
// Connection pool configuration:
//   - max: 10  — suitable for a typical Next.js + worker setup
//   - idle_timeout: 20 — close idle connections after 20s
//   - connect_timeout: 10 — fail fast if the DB is unreachable
//
// For Next.js serverless environments you may want to reduce `max` to 1 and
// rely on PgBouncer/Neon's pooler instead.

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
      "Please copy .env.example to .env.local and fill in the values."
  );
}

// Global singleton to avoid creating multiple connection pools during hot
// reloads in development (Next.js fast refresh re-imports modules).
const globalForDb = globalThis as unknown as {
  _ethianPgClient: postgres.Sql | undefined;
};

const client =
  globalForDb._ethianPgClient ??
  postgres(process.env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb._ethianPgClient = client;
}

// ---------------------------------------------------------------------------
// Drizzle instance
// ---------------------------------------------------------------------------

export const db = drizzle(client, { schema });

// Re-export schema for convenience so callers can do:
//   import { db, users, emails } from "@/db"
export * from "./schema";
