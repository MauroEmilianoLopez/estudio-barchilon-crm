import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, deals } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get("dealId");

  let query = db.select().from(payments);

  if (dealId) {
    query = query.where(eq(payments.dealId, dealId)) as typeof query;
  }

  const results = await query.orderBy(desc(payments.date));
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { dealId, date, amount, currency, paymentMethod, receipt } = body;

  if (!dealId || !date || !amount || !paymentMethod) {
    return NextResponse.json(
      { error: "Caso, fecha, monto y metodo de pago son requeridos" },
      { status: 400 }
    );
  }

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  try {
    const amountCents = Math.round(Number(amount));

    const [result] = await db
      .insert(payments)
      .values({
        dealId,
        date: new Date(date),
        amount: amountCents,
        currency: currency || "ARS",
        paymentMethod,
        receipt: receipt || null,
      })
      .returning();

    // Auto-update deals.paidAmount: sum all payments for this deal
    const [sumResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(eq(payments.dealId, dealId));

    await db
      .update(deals)
      .set({ paidAmount: Number(sumResult.total), updatedAt: new Date() })
      .where(eq(deals.id, dealId));

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    return NextResponse.json(
      { error: `Error al registrar pago: ${msg}` },
      { status: 500 }
    );
  }
}
