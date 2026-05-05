import "dotenv/config";
import { createClient } from "@libsql/client";
import crypto from "node:crypto";

const NEW_STAGE = {
  id: crypto.randomUUID(),
  name: "Prospecto",
  order: 2,
  color: "#f59e0b",
  is_won: 0,
  is_lost: 0,
};

const SHIFTS: Array<{ id: string; new_order: number; label: string }> = [
  { id: "af03afe9-de5d-41c8-9fe6-678aefc266e4", new_order: 7, label: "Cerrado" },
  { id: "8199eb4c-556f-4f83-baef-97395ed26ac4", new_order: 6, label: "Etapa final" },
  { id: "36bbba64-ca04-4a99-b448-1a5940620e0a", new_order: 5, label: "Esperando documentos" },
  { id: "0e386a06-5222-4afd-8bb8-0935ee8e8915", new_order: 4, label: "En proceso" },
  { id: "0af0b226-5d57-4cbc-9021-57de8a7d3572", new_order: 3, label: "Mediaciones" },
];

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL missing");

  const client = createClient({ url, authToken });

  const tx = await client.transaction("write");
  try {
    for (const s of SHIFTS) {
      await tx.execute({
        sql: `UPDATE pipeline_stages SET "order" = ? WHERE id = ?`,
        args: [s.new_order, s.id],
      });
      console.log(`✓ shift ${s.label}: → order=${s.new_order}`);
    }

    await tx.execute({
      sql: `INSERT INTO pipeline_stages (id, name, "order", color, is_won, is_lost) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [NEW_STAGE.id, NEW_STAGE.name, NEW_STAGE.order, NEW_STAGE.color, NEW_STAGE.is_won, NEW_STAGE.is_lost],
    });
    console.log(`✓ insert ${NEW_STAGE.name}: id=${NEW_STAGE.id.slice(0, 8)}…, order=${NEW_STAGE.order}, color=${NEW_STAGE.color}`);

    await tx.commit();
    console.log("\nTransacción commiteada.");
  } catch (e) {
    await tx.rollback();
    throw e;
  }

  const after = await client.execute(
    `SELECT "order", name, color, is_won, is_lost FROM pipeline_stages ORDER BY "order" ASC`
  );
  console.log("\n=== ESTADO POST-MIGRACIÓN ===");
  console.table(after.rows);

  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
