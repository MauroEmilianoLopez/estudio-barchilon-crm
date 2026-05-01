import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const LEGACY_FIELDS = ["case_type", "case_number", "court", "case_start_date"] as const;

async function main() {
  console.log("=== Migracion de campos legacy de contacts a deals ===\n");

  const { rows: contacts } = await client.execute(
    `SELECT id, name, case_type, case_number, court, case_start_date
     FROM contacts
     WHERE case_type IS NOT NULL
        OR case_number IS NOT NULL
        OR court IS NOT NULL
        OR case_start_date IS NOT NULL`
  );

  console.log(`Contactos con datos legacy: ${contacts.length}`);

  let dealsUpdated = 0;
  const orphans: Array<{ id: string; name: string; data: Record<string, unknown> }> = [];

  for (const contact of contacts) {
    const cId = String(contact.id);
    const { rows: deals } = await client.execute({
      sql: `SELECT id, case_type, case_number, court, case_start_date FROM deals WHERE contact_id = ?`,
      args: [cId],
    });

    if (deals.length === 0) {
      orphans.push({
        id: cId,
        name: String(contact.name ?? ""),
        data: {
          case_type: contact.case_type,
          case_number: contact.case_number,
          court: contact.court,
          case_start_date: contact.case_start_date,
        },
      });
      continue;
    }

    for (const deal of deals) {
      const sets: string[] = [];
      const args: unknown[] = [];

      for (const f of LEGACY_FIELDS) {
        if (deal[f] === null && contact[f] !== null) {
          sets.push(`${f} = ?`);
          args.push(contact[f]);
        }
      }

      if (sets.length > 0) {
        sets.push(`updated_at = ?`);
        args.push(Math.floor(Date.now() / 1000));
        args.push(String(deal.id));
        await client.execute({
          sql: `UPDATE deals SET ${sets.join(", ")} WHERE id = ?`,
          args: args as (string | number)[],
        });
        dealsUpdated++;
        console.log(`  + Deal ${String(deal.id).slice(0, 8)}... actualizado: ${sets.slice(0, -1).join(", ")}`);
      }
    }
  }

  console.log(`\nDeals actualizados: ${dealsUpdated}`);

  if (orphans.length > 0) {
    console.log(`\nContactos SIN deal asociado (esta data se va a perder al borrar columnas):`);
    for (const o of orphans) {
      console.log(`  - ${o.name} (${o.id.slice(0, 8)}...)`, o.data);
    }
  } else {
    console.log("\nTodos los contactos con data legacy tenian al menos un deal asociado.");
  }

  console.log("\n=== Borrando columnas legacy de contacts ===");
  for (const col of LEGACY_FIELDS) {
    try {
      await client.execute(`ALTER TABLE contacts DROP COLUMN ${col}`);
      console.log(`  + columna ${col} eliminada`);
    } catch (e) {
      console.error(`  ! error eliminando ${col}:`, (e as Error).message);
    }
  }

  console.log("\nMigracion completada.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Error en migracion:", e);
  process.exit(1);
});
