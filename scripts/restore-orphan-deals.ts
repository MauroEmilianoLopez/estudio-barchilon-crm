import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const orphans = [
  { idPrefix: "76d81f7a", caseType: "familia", caseNumber: "425234/24", court: "FAMILIA Nº 4", caseStartDate: 1733097600 },
  { idPrefix: "a3b7582c", caseType: "penal",   caseNumber: "PEX 446810/25", court: "Genero I", caseStartDate: null },
  { idPrefix: "86c9bae1", caseType: "familia", caseNumber: "EXP 431237/25", court: "familia Nº3", caseStartDate: null },
  { idPrefix: "edf2ad3c", caseType: "civil",   caseNumber: "EXP 439207/25", court: "CIVIL III", caseStartDate: 1759708800 },
  { idPrefix: "fb40f766", caseType: "familia", caseNumber: "EXP 423988/24", court: "familia Nº5", caseStartDate: null },
  { idPrefix: "b6e108dc", caseType: "civil",   caseNumber: "EXP 443851/25", court: "civil III", caseStartDate: 1765411200 },
  { idPrefix: "2468ed37", caseType: "penal",   caseNumber: "PEX 464059/25", court: "fiscalia 6", caseStartDate: 1759190400 },
];

async function main() {
  console.log("=== Restaurando 7 deals para contactos huerfanos ===\n");

  const { rows: stages } = await client.execute(
    `SELECT id, name FROM pipeline_stages ORDER BY "order" ASC LIMIT 1`
  );
  if (stages.length === 0) {
    throw new Error("No hay etapas en el pipeline");
  }
  const firstStageId = String(stages[0].id);
  console.log(`Etapa inicial: "${stages[0].name}" (${firstStageId})\n`);

  let created = 0;

  for (const o of orphans) {
    const { rows: cs } = await client.execute({
      sql: `SELECT id, name FROM contacts WHERE id LIKE ?`,
      args: [`${o.idPrefix}%`],
    });

    if (cs.length === 0) {
      console.log(`  ! No se encontro contacto con prefix ${o.idPrefix}`);
      continue;
    }
    if (cs.length > 1) {
      console.log(`  ! ${cs.length} contactos coinciden con prefix ${o.idPrefix}, salteando por seguridad`);
      continue;
    }

    const contact = cs[0];
    const contactId = String(contact.id);
    const name = String(contact.name ?? "Sin nombre").trim();
    const title = `Caso de ${name}`;
    const newId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await client.execute({
      sql: `INSERT INTO deals
              (id, title, value, stage_id, contact_id, probability, paid_amount,
               hearing_status, es_perentorio,
               case_type, case_number, court, case_start_date,
               created_at, updated_at)
            VALUES (?, ?, 0, ?, ?, 0, 0, 'pendiente', 0, ?, ?, ?, ?, ?, ?)`,
      args: [
        newId,
        title,
        firstStageId,
        contactId,
        o.caseType,
        o.caseNumber,
        o.court,
        o.caseStartDate,
        now,
        now,
      ],
    });

    console.log(`  + Deal creado: "${title}" | ${o.caseType} | ${o.caseNumber} | ${o.court}`);
    created++;
  }

  console.log(`\nDeals creados: ${created} / ${orphans.length}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
