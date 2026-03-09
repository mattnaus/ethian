import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// drizzle-kit is a plain CLI — it doesn't load Next.js's .env.local automatically.
config({ path: ".env.local" });

export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
