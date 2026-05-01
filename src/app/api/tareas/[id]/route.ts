import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tareas } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  const [existing] = await db.select().from(tareas).where(eq(tareas.id, id));
  if (!existing) {
    return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.titulo !== undefined) updateData.titulo = body.titulo;
  if (body.descripcion !== undefined) updateData.descripcion = body.descripcion || null;
  if (body.fecha !== undefined) updateData.fecha = body.fecha ? new Date(body.fecha) : existing.fecha;
  if (body.completada !== undefined) updateData.completada = body.completada === true;
  if (body.tipo === "vencimiento_judicial" || body.tipo === "tarea_procuracion") {
    updateData.tipo = body.tipo;
  }

  const [result] = await db.update(tareas).set(updateData).where(eq(tareas.id, id)).returning();
  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [existing] = await db.select().from(tareas).where(eq(tareas.id, id));
  if (!existing) {
    return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
  }

  await db.delete(tareas).where(eq(tareas.id, id));
  return NextResponse.json({ success: true });
}
