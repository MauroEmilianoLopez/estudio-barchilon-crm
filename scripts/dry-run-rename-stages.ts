import "dotenv/config";
import { createClient } from "@libsql/client";

const RENAMES: Record<string, string> = {
  "En negociación": "Mediaciones",
  "En negociacion": "Mediaciones",
  "Cerrado ganado": "Etapa final",
  "Cerrado perdido": "Cerrado",
};

const FINAL_ORDER = [
  "Consulta inicial",
  "Mediaciones",
  "En proceso",
  "Esperando documentos",
  "Etapa final",
  "Cerrado",
];

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL missing");

  const client = createClient({ url, authToken });

  const stagesRes = await client.execute(
    `SELECT id, name, "order", color, is_won, is_lost FROM pipeline_stages ORDER BY "order" ASC`
  );

  console.log("\n=== ESTADO ACTUAL pipeline_stages ===");
  console.table(
    stagesRes.rows.map((r) => ({
      order: r["order"],
      name: r.name,
      id: String(r.id).slice(0, 8) + "…",
      is_won: r.is_won,
      is_lost: r.is_lost,
    }))
  );

  const dealsCount = await client.execute(
    `SELECT s.name AS stage, COUNT(d.id) AS deals
       FROM pipeline_stages s
       LEFT JOIN deals d ON d.stage_id = s.id
      GROUP BY s.id ORDER BY s."order" ASC`
  );
  console.log("\n=== DEALS POR ETAPA (referencias por stage_id, NO cambian) ===");
  console.table(dealsCount.rows);

  console.log("\n=== UPDATEs PROPUESTOS (dry-run, no se ejecutan) ===");
  type Plan = { id: string; old_name: string; new_name: string; old_order: number; new_order: number };
  const plan: Plan[] = [];

  for (const row of stagesRes.rows) {
    const id = String(row.id);
    const oldName = String(row.name);
    const oldOrder = Number(row["order"]);
    const newName = RENAMES[oldName] ?? oldName;
    const newOrder = FINAL_ORDER.indexOf(newName) + 1;
    if (newOrder === 0) {
      console.warn(`  ⚠️  Etapa "${oldName}" no aparece en el orden final propuesto.`);
    }
    plan.push({ id, old_name: oldName, new_name: newName, old_order: oldOrder, new_order: newOrder });
  }

  console.table(
    plan.map((p) => ({
      id: p.id.slice(0, 8) + "…",
      old_name: p.old_name,
      new_name: p.new_name === p.old_name ? "(sin cambio)" : p.new_name,
      old_order: p.old_order,
      new_order: p.new_order,
      changed: p.old_name !== p.new_name || p.old_order !== p.new_order ? "SI" : "no",
    }))
  );

  const willChange = plan.filter(
    (p) => p.old_name !== p.new_name || p.old_order !== p.new_order
  );
  console.log(`\nFilas a modificar: ${willChange.length} de ${plan.length}`);
  console.log("Deals afectados: 0 (no se tocan los stage_id, los UPDATEs son solo sobre pipeline_stages)");

  console.log("\nSQL que se ejecutaría:");
  for (const p of willChange) {
    console.log(
      `  UPDATE pipeline_stages SET name='${p.new_name}', "order"=${p.new_order} WHERE id='${p.id}';`
    );
  }

  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
