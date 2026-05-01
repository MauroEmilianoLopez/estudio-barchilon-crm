import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tareas, deals, contacts } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get("dealId");
  const contactId = searchParams.get("contactId");
  const completadaParam = searchParams.get("completada");
  const tipo = searchParams.get("tipo");

  const filters = [];
  if (dealId) filters.push(eq(tareas.dealId, dealId));
  if (contactId) filters.push(eq(tareas.contactId, contactId));
  if (completadaParam === "true") filters.push(eq(tareas.completada, true));
  if (completadaParam === "false") filters.push(eq(tareas.completada, false));
  if (tipo === "vencimiento_judicial" || tipo === "tarea_procuracion") {
    filters.push(eq(tareas.tipo, tipo));
  }

  const rows = await db
    .select({
      id: tareas.id,
      dealId: tareas.dealId,
      contactId: tareas.contactId,
      tipo: tareas.tipo,
      titulo: tareas.titulo,
      descripcion: tareas.descripcion,
      fecha: tareas.fecha,
      completada: tareas.completada,
      createdAt: tareas.createdAt,
      dealTitle: deals.title,
      contactName: contacts.name,
      caseType: deals.caseType,
    })
    .from(tareas)
    .leftJoin(deals, eq(tareas.dealId, deals.id))
    .leftJoin(contacts, eq(tareas.contactId, contacts.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(tareas.fecha));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { dealId, contactId, tipo, titulo, descripcion, fecha } = body;

  if (!dealId || !titulo || !fecha) {
    return NextResponse.json(
      { error: "dealId, titulo y fecha son requeridos" },
      { status: 400 }
    );
  }

  let finalContactId: string | null = contactId ?? null;
  if (!finalContactId) {
    const [deal] = await db.select({ contactId: deals.contactId }).from(deals).where(eq(deals.id, dealId));
    if (!deal) {
      return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
    }
    finalContactId = deal.contactId;
  }

  const finalTipo = tipo === "vencimiento_judicial" ? "vencimiento_judicial" : "tarea_procuracion";

  try {
    const [created] = await db
      .insert(tareas)
      .values({
        dealId,
        contactId: finalContactId,
        tipo: finalTipo,
        titulo,
        descripcion: descripcion || null,
        fecha: new Date(fecha),
        completada: false,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg.includes("FOREIGN KEY")) {
      return NextResponse.json({ error: "Caso o contacto no encontrado" }, { status: 400 });
    }
    return NextResponse.json({ error: `Error al crear tarea: ${msg}` }, { status: 500 });
  }
}
