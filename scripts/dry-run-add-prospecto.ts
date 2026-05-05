import "dotenv/config";
import { createClient } from "@libsql/client";

const NEW_STAGE = {
  name: "Prospecto",
  order: 2,
  color: "#f59e0b",
  is_won: 0,
  is_lost: 0,
};

const SHIFT_PLAN: Array<{ name: string; old_order: number; new_order: number }> = [
  { name: "Mediaciones", old_order: 2, new_order: 3 },
  { name: "En proceso", old_order: 3, new_order: 4 },
  { name: "Esperando documentos", old_order: 4, new_order: 5 },
  { name: "Etapa final", old_order: 5, new_order: 6 },
  { name: "Cerrado", old_order: 6, new_order: 7 },
];

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL missing");

  const client = createClient({ url, authToken });

  const before = await client.execute(
    `SELECT id, name, "order", color, is_won, is_lost FROM pipeline_stages ORDER BY "order" ASC`
  );
  console.log("\n=== ESTADO ACTUAL ===");
  console.table(
    before.rows.map((r) => ({
      order: r["order"],
      name: r.name,
      id: String(r.id).slice(0, 8) + "…",
      color: r.color,
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
  console.log("\n=== DEALS POR ETAPA (no se reasignan, solo se renumera order) ===");
  console.table(dealsCount.rows);

  console.log("\n=== PLAN ===");
  console.log("1) INSERT pipeline_stages:");
  console.log(
    `   name="${NEW_STAGE.name}", order=${NEW_STAGE.order}, color="${NEW_STAGE.color}", is_won=${NEW_STAGE.is_won}, is_lost=${NEW_STAGE.is_lost}`
  );
  console.log("\n2) UPDATEs de reorder (en orden descendente para evitar colisiones si hubiera índice único):");

  const ordered = [...SHIFT_PLAN].sort((a, b) => b.new_order - a.new_order);
  for (const s of ordered) {
    const row = before.rows.find((r) => String(r.name) === s.name);
    if (!row) {
      console.warn(`   ⚠️ NO ENCONTRADO: "${s.name}" — abortar antes de ejecutar`);
      continue;
    }
    console.log(
      `   UPDATE pipeline_stages SET "order"=${s.new_order} WHERE id='${String(row.id).slice(0, 8)}…';  -- ${s.name}: ${s.old_order} → ${s.new_order}`
    );
  }

  console.log("\n=== RESULTADO ESPERADO ===");
  const expected = [
    { order: 1, name: "Consulta inicial" },
    { order: 2, name: "Prospecto (NUEVO)" },
    { order: 3, name: "Mediaciones" },
    { order: 4, name: "En proceso" },
    { order: 5, name: "Esperando documentos" },
    { order: 6, name: "Etapa final" },
    { order: 7, name: "Cerrado" },
  ];
  console.table(expected);

  console.log("\nFilas a modificar: 5 UPDATEs + 1 INSERT");
  console.log("Deals reasignados: 0 (los stage_id existentes no se tocan)");

  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
