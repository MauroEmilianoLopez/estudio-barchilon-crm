#!/usr/bin/env npx tsx

/**
 * Local schema alignment script.
 *
 * This script is intentionally local-only. It never uses TURSO_DATABASE_URL and
 * refuses to run when TURSO_DATABASE_URL points to a remote database.
 */

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

const LOCAL_DB_URL = "file:data/crm.db";
const LOCAL_DB_PATH = path.join(process.cwd(), "data", "crm.db");

type ActionStatus = "added" | "exists" | "missing-table";

type ActionReport = {
  target: string;
  status: ActionStatus;
  detail: string;
};

const remoteUrl = process.env.TURSO_DATABASE_URL;

if (remoteUrl && !remoteUrl.startsWith("file:")) {
  throw new Error(
    "Refusing to run local schema alignment while TURSO_DATABASE_URL points to a remote database."
  );
}

if (!fs.existsSync(LOCAL_DB_PATH)) {
  throw new Error(`Local database not found at ${LOCAL_DB_PATH}`);
}

const client = createClient({ url: LOCAL_DB_URL });

async function tableExists(tableName: string): Promise<boolean> {
  const result = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [tableName],
  });

  return result.rows.length > 0;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await client.execute(`PRAGMA table_info(${tableName})`);
  return result.rows.some((row) => row.name === columnName);
}

async function addColumnIfMissing(
  tableName: string,
  columnName: string,
  sql: string
): Promise<ActionReport> {
  if (!(await tableExists(tableName))) {
    return {
      target: `${tableName}.${columnName}`,
      status: "missing-table",
      detail: `Skipped because table ${tableName} does not exist.`,
    };
  }

  if (await columnExists(tableName, columnName)) {
    return {
      target: `${tableName}.${columnName}`,
      status: "exists",
      detail: "Column already exists.",
    };
  }

  await client.execute(sql);

  return {
    target: `${tableName}.${columnName}`,
    status: "added",
    detail: "Column added.",
  };
}

async function createTareasIfMissing(): Promise<ActionReport> {
  if (await tableExists("tareas")) {
    return {
      target: "tareas",
      status: "exists",
      detail: "Table already exists.",
    };
  }

  await client.execute(`
    CREATE TABLE tareas (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL REFERENCES deals(id),
      contact_id TEXT NOT NULL REFERENCES contacts(id),
      tipo TEXT NOT NULL DEFAULT 'tarea_procuracion',
      titulo TEXT NOT NULL,
      descripcion TEXT,
      fecha INTEGER NOT NULL,
      completada INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  return {
    target: "tareas",
    status: "added",
    detail: "Table created.",
  };
}

async function countRows(tableName: string): Promise<string> {
  if (!(await tableExists(tableName))) {
    return "missing";
  }

  const result = await client.execute(`SELECT COUNT(*) AS count FROM ${tableName}`);
  return String(result.rows[0].count);
}

async function main() {
  console.log("Local CRM schema alignment");
  console.log(`Database: ${LOCAL_DB_URL}`);
  console.log(`Path: ${LOCAL_DB_PATH}`);
  console.log("Remote database: not used");
  console.log("");

  const reports: ActionReport[] = [];

  reports.push(
    await addColumnIfMissing(
      "pipeline_stages",
      "pipeline_type",
      "ALTER TABLE pipeline_stages ADD COLUMN pipeline_type TEXT NOT NULL DEFAULT 'judicial'"
    )
  );

  reports.push(
    await addColumnIfMissing(
      "deals",
      "pipeline_type",
      "ALTER TABLE deals ADD COLUMN pipeline_type TEXT NOT NULL DEFAULT 'judicial'"
    )
  );

  reports.push(
    await addColumnIfMissing(
      "deals",
      "organismo",
      "ALTER TABLE deals ADD COLUMN organismo TEXT"
    )
  );

  reports.push(await createTareasIfMissing());

  console.log("Alignment report:");
  for (const report of reports) {
    console.log(`- ${report.target}: ${report.status} — ${report.detail}`);
  }

  console.log("");
  console.log("Final table counts:");
  const tables = [
    "contacts",
    "pipeline_stages",
    "deals",
    "activities",
    "payments",
    "crm_settings",
    "tareas",
  ];

  for (const table of tables) {
    console.log(`- ${table}: ${await countRows(table)}`);
  }
}

main()
  .catch((error) => {
    console.error("Local schema alignment failed:", error);
    process.exit(1);
  })
  .finally(() => {
    client.close();
  });
