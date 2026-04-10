import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deals, contacts } from "@/db/schema";
import { eq, isNotNull, asc, or } from "drizzle-orm";

export async function GET() {
  const items = await db
    .select({
      dealId: deals.id,
      dealTitle: deals.title,
      nextHearing: deals.nextHearing,
      hearingStatus: deals.hearingStatus,
      contactId: deals.contactId,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      caseType: contacts.caseType,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .where(isNotNull(deals.nextHearing))
    .orderBy(asc(deals.nextHearing));

  return NextResponse.json(items);
}

export async function PUT(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { dealId, action, newDate } = body;

  if (!dealId || !action) {
    return NextResponse.json({ error: "dealId y action son requeridos" }, { status: 400 });
  }

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  switch (action) {
    case "realizada":
      await db.update(deals).set({
        hearingStatus: "realizada",
        updatedAt: new Date(),
      }).where(eq(deals.id, dealId));
      return NextResponse.json({ success: true });

    case "cancelada":
      await db.update(deals).set({
        hearingStatus: "cancelada",
        updatedAt: new Date(),
      }).where(eq(deals.id, dealId));
      return NextResponse.json({ success: true });

    case "reprogramar":
      if (!newDate) {
        return NextResponse.json({ error: "newDate es requerido" }, { status: 400 });
      }
      await db.update(deals).set({
        nextHearing: new Date(newDate),
        hearingStatus: "pendiente",
        updatedAt: new Date(),
      }).where(eq(deals.id, dealId));
      return NextResponse.json({ success: true });

    default:
      return NextResponse.json({ error: "Accion invalida" }, { status: 400 });
  }
}
