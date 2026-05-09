import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deals, contacts, pipelineStages, tareas } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { addBusinessDays } from "@/lib/businessDays";

export async function GET() {
  const results = await db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      stageId: deals.stageId,
      contactId: deals.contactId,
      expectedClose: deals.expectedClose,
      probability: deals.probability,
      notes: deals.notes,
      agreedFees: deals.agreedFees,
      paidAmount: deals.paidAmount,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      contactName: contacts.name,
      contactEmail: contacts.email,
      contactTemperature: contacts.temperature,
      stageName: pipelineStages.name,
      stageColor: pipelineStages.color,
      stageOrder: pipelineStages.order,
      stageIsWon: pipelineStages.isWon,
      stageIsLost: pipelineStages.isLost,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .orderBy(desc(deals.createdAt));

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const { title, value, stageId, contactId, expectedClose, probability, notes, agreedFees, paidAmount, nextHearing, esPerentorio, caseType, caseNumber, court, caseStartDate, internalNotes, pipelineType, organismo } = body;

  if (!title || !contactId) {
    return NextResponse.json(
      { error: "Titulo y contacto son requeridos" },
      { status: 400 }
    );
  }

  const finalPipelineType = pipelineType === "administrativo" ? "administrativo" : "judicial";

  // Get first stage of the right pipeline if none provided
  let finalStageId = stageId;
  if (!finalStageId) {
    const [firstStage] = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineType, finalPipelineType))
      .orderBy(pipelineStages.order)
      .limit(1);
    finalStageId = firstStage?.id;
  }

  if (!finalStageId) {
    return NextResponse.json(
      { error: "No hay etapas de pipeline configuradas" },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const [result] = await db
      .insert(deals)
      .values({
        title,
        value: value || 0,
        stageId: finalStageId,
        contactId,
        expectedClose: expectedClose ? new Date(expectedClose) : null,
        probability: Math.max(0, Math.min(100, Number(probability) || 0)),
        notes: notes || null,
        agreedFees: agreedFees != null ? Math.round(parseFloat(agreedFees) * 100) : null,
        paidAmount: paidAmount != null ? Math.round(parseFloat(paidAmount) * 100) : 0,
        nextHearing: nextHearing ? new Date(nextHearing) : null,
        esPerentorio: esPerentorio === true,
        caseType: caseType || null,
        caseNumber: caseNumber || null,
        court: court || null,
        caseStartDate: caseStartDate ? new Date(caseStartDate) : null,
        internalNotes: internalNotes || null,
        pipelineType: finalPipelineType,
        organismo: organismo || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    try {
      const [stage] = await db
        .select({ name: pipelineStages.name })
        .from(pipelineStages)
        .where(eq(pipelineStages.id, finalStageId));
      if (stage?.name === "Prospecto") {
        const [contact] = await db
          .select({ name: contacts.name })
          .from(contacts)
          .where(eq(contacts.id, contactId));
        const contactName = contact?.name || "cliente";
        await db.insert(tareas).values({
          dealId: result.id,
          contactId,
          tipo: "tarea_procuracion",
          titulo: `Seguimiento con ${contactName}`,
          descripcion: "Cliente en etapa Prospecto sin contacto reciente",
          fecha: addBusinessDays(now, 5),
          completada: false,
        });
      }
    } catch (e) {
      console.error("Failed to auto-create Prospecto follow-up tarea:", e);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    if (msg.includes("FOREIGN KEY")) {
      return NextResponse.json(
        { error: "Contacto no encontrado" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Error al crear caso: ${msg}` },
      { status: 500 }
    );
  }
}
