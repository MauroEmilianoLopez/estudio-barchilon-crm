import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const isProduction = process.env.NODE_ENV === "production";
const url = process.env.TURSO_DATABASE_URL || (isProduction ? "" : "file:data/crm.db");

if (isProduction && !process.env.TURSO_DATABASE_URL) {
  console.error(
    "TURSO_DATABASE_URL is not set. Add it in Vercel > Settings > Environment Variables."
  );
}

const client = createClient({
  url: url || "file:data/crm.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
