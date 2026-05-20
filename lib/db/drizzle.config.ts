import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// drizzle-kit does not treat barrel files (index.ts that only re-exports) as schema
// sources — it collects table definitions per source file. globs must use forward
// slashes so they expand on Windows (backslash + * is a literal path segment).
export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
