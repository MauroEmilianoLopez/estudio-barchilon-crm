import "dotenv/config";
import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL missing");

  const client = createClient({ url, authToken });

  const updates = [
    { id: "0af0b226-5d57-4cbc-9021-57de8a7d3572", name: "Mediaciones",          order: 2, is_lost: null as number | null },
    { id: "0e386a06-5222-4afd-8bb8-0935ee8e8915", name: "En proceso",           order: 3, is_lost: null },
    { id: "36bbba64-ca04-4a99-b448-1a5940620e0a", name: "Esperando documentos", order: 4, is_lost: null },
    { id: "8199eb4c-556f-4f83-baef-97395ed26ac4", name: "Etapa final",          order: 5, is_lost: null },
    { id: "af03afe9-de5d-41c8-9fe6-678aefc266e4", name: "Cerrado",              order: 6, is_lost: 0 },
  ];

  const tx = await client.transaction("write");
  try {
    for (const u of updates) {
      if (u.is_lost === null) {
        await tx.execute({
          sql: `UPDATE pipeline_stages SET name = ?, "order" = ? WHERE id = ?`,
          args: [u.name, u.order, u.id],
        });
      } else {
        await tx.execute({
          sql: `UPDATE pipeline_stages SET name = ?, "order" = ?, is_lost = ? WHERE id = ?`,
          args: [u.name, u.order, u.is_lost, u.id],
        });
      }
      console.log(`✓ ${u.id.slice(0, 8)}… → name='${u.name}', order=${u.order}${u.is_lost !== null ? `, is_lost=${u.is_lost}` : ""}`);
    }
    await tx.commit();
    console.log("\nTransacción commiteada.");
  } catch (e) {
    await tx.rollback();
    throw e;
  }

  const after = await client.execute(
    `SELECT "order", name, is_won, is_lost FROM pipeline_stages ORDER BY "order" ASC`
  );
  console.log("\n=== ESTADO POST-UPDATE ===");
  console.table(after.rows);

  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
