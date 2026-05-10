import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [deal] = await db.select().from(deals).where(eq(deals.id, id));

  if (!deal) {
    return NextResponse.json(
      { error: "Caso no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(deal);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const [existing] = await db.select().from(deals).where(eq(deals.id, id));

  if (!existing) {
    return NextResponse.json(
      { error: "Caso no encontrado" },
      { status: 404 }
    );
  }

  // Only allow updating specific fields
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.value !== undefined) updateData.value = body.value;
  if (body.stageId !== undefined) {
    if (!body.stageId || typeof body.stageId !== "string") {
      return NextResponse.json({ error: "stageId no puede ser vacío" }, { status: 400 });
    }
    updateData.stageId = body.stageId;
  }
  if (body.contactId !== undefined) updateData.contactId = body.contactId;
  if (body.expectedClose !== undefined) {
    updateData.expectedClose = body.expectedClose ? new Date(body.expectedClose) : null;
  }
  if (body.probability !== undefined) {
    updateData.probability = Math.max(0, Math.min(100, Number(body.probability)));
  }
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.agreedFees !== undefined) {
    updateData.agreedFees = body.agreedFees != null ? Math.round(parseFloat(body.agreedFees) * 100) : null;
  }
  if (body.paidAmount !== undefined) {
    updateData.paidAmount = body.paidAmount != null ? Math.round(parseFloat(body.paidAmount) * 100) : 0;
  }
  if (body.nextHearing !== undefined) {
    updateData.nextHearing = body.nextHearing ? new Date(body.nextHearing) : null;
  }
  if (body.esPerentorio !== undefined) updateData.esPerentorio = body.esPerentorio === true;
  if (body.caseType !== undefined) updateData.caseType = body.caseType || null;
  if (body.caseNumber !== undefined) updateData.caseNumber = body.caseNumber || null;
  if (body.court !== undefined) updateData.court = body.court || null;
  if (body.caseStartDate !== undefined) {
    updateData.caseStartDate = body.caseStartDate ? new Date(body.caseStartDate) : null;
  }
  if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes;
  if (body.pipelineType !== undefined) {
    updateData.pipelineType = body.pipelineType === "administrativo" ? "administrativo" : "judicial";
  }
  if (body.organismo !== undefined) updateData.organismo = body.organismo || null;

  try {
    const [result] = await db
      .update(deals)
      .set(updateData)
      .where(eq(deals.id, id))
      .returning();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    console.error("PUT /api/deals/[id] failed:", msg, "updateData keys:", Object.keys(updateData));
    return NextResponse.json({ error: `Error al actualizar caso: ${msg}` }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [existing] = await db.select().from(deals).where(eq(deals.id, id));

  if (!existing) {
    return NextResponse.json(
      { error: "Caso no encontrado" },
      { status: 404 }
    );
  }

  await db.delete(deals).where(eq(deals.id, id));
  return NextResponse.json({ success: true });
}
