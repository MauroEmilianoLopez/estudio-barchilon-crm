import "dotenv/config";
import { createClient } from "@libsql/client";
import crypto from "node:crypto";

const NEW_ADMIN_STAGES = [
  { order: 1, name: "Consulta inicial", color: "#64748b", is_won: 0, is_lost: 0 },
  { order: 2, name: "Documentación",    color: "#f59e0b", is_won: 0, is_lost: 0 },
  { order: 3, name: "Presentado",       color: "#3b82f6", is_won: 0, is_lost: 0 },
  { order: 4, name: "En trámite",       color: "#8b5cf6", is_won: 0, is_lost: 0 },
  { order: 5, name: "Resolución",       color: "#16a34a", is_won: 0, is_lost: 0 },
  { order: 6, name: "Cobro",            color: "#16a34a", is_won: 1, is_lost: 0 },
  { order: 7, name: "Cerrado",          color: "#dc2626", is_won: 0, is_lost: 0 },
];

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL missing");

  const client = createClient({ url, authToken });

  const dealsCols = await client.execute(`PRAGMA table_info(deals)`);
  const stagesCols = await client.execute(`PRAGMA table_info(pipeline_stages)`);
  const dealsHasPipelineType = dealsCols.rows.some((r) => r.name === "pipeline_type");
  const dealsHasOrganismo = dealsCols.rows.some((r) => r.name === "organismo");
  const stagesHasPipelineType = stagesCols.rows.some((r) => r.name === "pipeline_type");

  // ALTER TABLE no es transaccional en SQLite/libsql, ejecutar fuera de tx
  if (!stagesHasPipelineType) {
    await client.execute(`ALTER TABLE pipeline_stages ADD COLUMN pipeline_type TEXT NOT NULL DEFAULT 'judicial'`);
    console.log("✓ ALTER pipeline_stages.pipeline_type");
  } else {
    console.log("· pipeline_stages.pipeline_type ya existe");
  }
  if (!dealsHasPipelineType) {
    await client.execute(`ALTER TABLE deals ADD COLUMN pipeline_type TEXT NOT NULL DEFAULT 'judicial'`);
    console.log("✓ ALTER deals.pipeline_type");
  } else {
    console.log("· deals.pipeline_type ya existe");
  }
  if (!dealsHasOrganismo) {
    await client.execute(`ALTER TABLE deals ADD COLUMN organismo TEXT`);
    console.log("✓ ALTER deals.organismo");
  } else {
    console.log("· deals.organismo ya existe");
  }

  // INSERTs sí dentro de transacción
  const tx = await client.transaction("write");
  try {
    for (const s of NEW_ADMIN_STAGES) {
      const id = crypto.randomUUID();
      await tx.execute({
        sql: `INSERT INTO pipeline_stages (id, name, "order", color, is_won, is_lost, pipeline_type)
              VALUES (?, ?, ?, ?, ?, ?, 'administrativo')`,
        args: [id, s.name, s.order, s.color, s.is_won, s.is_lost],
      });
      console.log(`✓ INSERT admin/${s.order} ${s.name}: ${id.slice(0, 8)}…${s.is_won ? " (is_won)" : ""}`);
    }
    await tx.commit();
    console.log("\nTransacción commiteada.");
  } catch (e) {
    await tx.rollback();
    throw e;
  }

  const after = await client.execute(
    `SELECT pipeline_type, "order", name, is_won, is_lost
       FROM pipeline_stages
      ORDER BY pipeline_type, "order"`
  );
  console.log("\n=== ESTADO POST-MIGRACIÓN ===");
  console.table(after.rows);

  const dealsCheck = await client.execute(
    `SELECT pipeline_type, COUNT(*) as count FROM deals GROUP BY pipeline_type`
  );
  console.log("\n=== DEALS POR pipeline_type ===");
  console.table(dealsCheck.rows);

  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
