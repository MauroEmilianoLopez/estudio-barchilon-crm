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

  console.log("\n=== ESTADO ACTUAL ===");
  const dealsCols = await client.execute(`PRAGMA table_info(deals)`);
  const stagesCols = await client.execute(`PRAGMA table_info(pipeline_stages)`);
  const dealsHasPipelineType = dealsCols.rows.some((r) => r.name === "pipeline_type");
  const dealsHasOrganismo = dealsCols.rows.some((r) => r.name === "organismo");
  const stagesHasPipelineType = stagesCols.rows.some((r) => r.name === "pipeline_type");

  console.log(`  deals.pipeline_type:           ${dealsHasPipelineType ? "EXISTE" : "FALTA"}`);
  console.log(`  deals.organismo:               ${dealsHasOrganismo ? "EXISTE" : "FALTA"}`);
  console.log(`  pipeline_stages.pipeline_type: ${stagesHasPipelineType ? "EXISTE" : "FALTA"}`);

  const allStages = await client.execute(
    `SELECT id, name, "order", color, is_won, is_lost FROM pipeline_stages ORDER BY "order"`
  );
  console.log(`\n  pipeline_stages actuales: ${allStages.rows.length}`);
  console.table(
    allStages.rows.map((r) => ({
      order: r["order"],
      name: r.name,
      id: String(r.id).slice(0, 8) + "…",
      is_won: r.is_won,
      is_lost: r.is_lost,
    }))
  );

  const allDeals = await client.execute(`SELECT COUNT(*) as c FROM deals`);
  console.log(`  deals actuales: ${allDeals.rows[0].c}\n`);

  console.log("=== PLAN ===");
  console.log("\n1) ALTER TABLE — 3 columnas nuevas (aditivas, sin pérdida de datos):");
  if (!stagesHasPipelineType) {
    console.log(`   ALTER TABLE pipeline_stages ADD COLUMN pipeline_type TEXT NOT NULL DEFAULT 'judicial';`);
    console.log(`   → 7 stages existentes quedan implícitamente pipeline_type='judicial'`);
  } else {
    console.log(`   pipeline_stages.pipeline_type ya existe — skip`);
  }
  if (!dealsHasPipelineType) {
    console.log(`   ALTER TABLE deals ADD COLUMN pipeline_type TEXT NOT NULL DEFAULT 'judicial';`);
    console.log(`   → ${allDeals.rows[0].c} deals existentes quedan pipeline_type='judicial'`);
  } else {
    console.log(`   deals.pipeline_type ya existe — skip`);
  }
  if (!dealsHasOrganismo) {
    console.log(`   ALTER TABLE deals ADD COLUMN organismo TEXT;`);
    console.log(`   → deals existentes quedan organismo=NULL`);
  } else {
    console.log(`   deals.organismo ya existe — skip`);
  }

  console.log("\n2) INSERT 7 nuevas pipeline_stages administrativo:");
  console.table(
    NEW_ADMIN_STAGES.map((s) => ({
      order: s.order,
      name: s.name,
      color: s.color,
      is_won: s.is_won,
      is_lost: s.is_lost,
      uuid: "(se genera al insertar)",
    }))
  );

  console.log("\n=== ESTADO ESPERADO POST-MIGRACIÓN ===");
  console.log("  pipeline_stages: 14 (7 judicial + 7 administrativo)");
  console.log("  deals: sin cambios en cantidad; todos con pipeline_type='judicial', organismo=NULL");
  console.log("  Stage is_won del pipeline administrativo: 'Cobro' (order=6)");
  console.log("  Reasignación de deals: 0 (los stage_id existentes no se tocan)\n");

  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
