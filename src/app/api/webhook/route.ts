import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities, crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret",
};

function jsonWithCors(
  body: Record<string, unknown>,
  status: number
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: CORS_HEADERS,
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readTimestamp(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

type DbTransaction = Parameters<typeof db.transaction>[0] extends (
  tx: infer T,
  ...args: never[]
) => unknown
  ? T
  : never;

// Field name mapping: common variations → standard field
const FIELD_MAP: Record<string, string> = {
  // Name
  name: "name",
  nombre: "name",
  full_name: "name",
  fullname: "name",
  first_name: "name",
  nombre_completo: "name",
  // Email
  email: "email",
  correo: "email",
  email_address: "email",
  correo_electronico: "email",
  // Phone
  phone: "phone",
  telefono: "phone",
  phone_number: "phone",
  cel: "phone",
  celular: "phone",
  whatsapp: "phone",
  movil: "phone",
  // Company
  company: "company",
  empresa: "company",
  company_name: "company",
  negocio: "company",
  organizacion: "company",
  // Notes
  notes: "notes",
  notas: "notes",
  message: "notes",
  mensaje: "notes",
  comments: "notes",
  comentarios: "notes",
  descripcion: "notes",
};

function extractFields(
  payload: Record<string, unknown>
): Record<string, string> {
  // Handle Typeform-style nested data
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
    const mappedField = FIELD_MAP[normalizedKey];
    if (mappedField && !result[mappedField]) {
      result[mappedField] = String(value).trim();
    }
  }

  // Handle "first_name + last_name" pattern
  if (!result.name) {
    const firstName =
      data.first_name || data.nombre || data.firstName || data.primer_nombre;
    const lastName =
      data.last_name || data.apellido || data.lastName || data.apellidos;
    if (firstName) {
      result.name = [firstName, lastName].filter(Boolean).join(" ").trim();
    }
  }

  return result;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  // Auth check: if a webhook secret is stored, require it in the header
  const [stored] = await db
    .select()
    .from(crmSettings)
    .where(eq(crmSettings.key, "webhook_secret"));

  if (stored) {
    const secretHeader = request.headers.get("x-webhook-secret");
    if (!secretHeader || secretHeader !== stored.value) {
      return jsonWithCors({ error: "Secret invalido o faltante" }, 401);
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonWithCors({ error: "JSON invalido" }, 400);
  }

  const fields = extractFields(payload);
  const website = normalizeOptionalText(payload.website);
  const hasFormStartedAt = Object.prototype.hasOwnProperty.call(
    payload,
    "formStartedAt"
  );
  const hasSubmittedAt = Object.prototype.hasOwnProperty.call(
    payload,
    "submittedAt"
  );
  const timestampValue = hasFormStartedAt
    ? payload.formStartedAt
    : payload.submittedAt;
  const formStartedAt =
    hasFormStartedAt || hasSubmittedAt ? readTimestamp(timestampValue) : undefined;
  const isIntakeFormPayload =
    Object.prototype.hasOwnProperty.call(payload, "website") ||
    hasFormStartedAt ||
    hasSubmittedAt;

  if (website) {
    return jsonWithCors({ error: "Solicitud invalida" }, 400);
  }

  if (hasFormStartedAt || hasSubmittedAt) {
    if (formStartedAt === undefined) {
      return jsonWithCors({ error: "Solicitud invalida" }, 400);
    }

    const elapsedMs = Date.now() - formStartedAt;

    if (!Number.isFinite(formStartedAt) || elapsedMs < 3_000 || elapsedMs > 86_400_000) {
      return jsonWithCors({ error: "Solicitud invalida" }, 400);
    }
  }

  if (fields.name) fields.name = fields.name.trim();
  if (fields.email) fields.email = fields.email.trim().toLowerCase();
  if (fields.phone) fields.phone = fields.phone.trim();
  if (fields.notes) fields.notes = fields.notes.trim();
  if (fields.company) fields.company = fields.company.trim();

  if (!fields.name) {
    return jsonWithCors(
      {
        error: "Campo 'name' o 'nombre' es requerido",
        received: Object.keys(payload),
        hint: "Campos soportados: name, nombre, full_name, email, correo, phone, telefono, company, empresa, notes, notas, message",
      },
      400
    );
  }

  if (fields.name.length < 2 || fields.name.length > 120) {
    return jsonWithCors({ error: "Nombre invalido" }, 400);
  }

  if (fields.email && !isValidEmail(fields.email)) {
    return jsonWithCors({ error: "Email invalido" }, 400);
  }

  if (fields.email && fields.email.length > 254) {
    return jsonWithCors({ error: "Email invalido" }, 400);
  }

  if (fields.phone && fields.phone.length > 40) {
    return jsonWithCors({ error: "Telefono invalido" }, 400);
  }

  if (fields.company && fields.company.length > 160) {
    return jsonWithCors({ error: "Empresa invalida" }, 400);
  }

  if (fields.notes && fields.notes.length > 3000) {
    return jsonWithCors({ error: "Mensaje invalido" }, 400);
  }

  if (isIntakeFormPayload && !fields.notes) {
    return jsonWithCors({ error: "Mensaje invalido" }, 400);
  }

  try {
    const contact = await db.transaction(async (tx: DbTransaction) => {
      const now = new Date();
      let contactRecord: typeof contacts.$inferSelect | undefined;

      if (fields.email) {
        const [existingByEmail] = await tx
          .select()
          .from(contacts)
          .where(eq(contacts.email, fields.email))
          .limit(1);

        if (existingByEmail) {
          contactRecord = existingByEmail;
        }
      }

      if (!contactRecord && fields.phone) {
        const [existingByPhone] = await tx
          .select()
          .from(contacts)
          .where(eq(contacts.phone, fields.phone))
          .limit(1);

        if (existingByPhone) {
          contactRecord = existingByPhone;
        }
      }

      if (contactRecord) {
        const updates: Record<string, string | Date> = {};

        if (!contactRecord.email && fields.email) {
          updates.email = fields.email;
        }

        if (!contactRecord.phone && fields.phone) {
          updates.phone = fields.phone;
        }

        if (!contactRecord.company && fields.company) {
          updates.company = fields.company;
        }

        if (Object.keys(updates).length > 0) {
          const [updatedContact] = await tx
            .update(contacts)
            .set({
              ...updates,
              updatedAt: now,
            })
            .where(eq(contacts.id, contactRecord.id))
            .returning();

          contactRecord = updatedContact ?? contactRecord;
        }
      } else {
        const [createdContact] = await tx
          .insert(contacts)
          .values({
            name: fields.name,
            email: fields.email || null,
            phone: fields.phone || null,
            company: fields.company || null,
            source: "webhook",
            temperature: "cold",
            score: 0,
            notes: fields.notes || null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        contactRecord = createdContact;
      }

      await tx.insert(activities).values({
        type: "note",
        description: `Cliente recibido via webhook${fields.company ? ` (${fields.company})` : ""}`,
        contactId: contactRecord.id,
        createdAt: now,
      });

      return contactRecord;
    });

    return jsonWithCors(
      {
        success: true,
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          source: contact.source,
        },
      },
      201
    );
  } catch (error) {
    console.error("[webhook] Error al procesar intake", error);
    return jsonWithCors(
      {
        error: "No pudimos procesar su consulta. Intente nuevamente más tarde.",
      },
      500
    );
  }
}
