import { db } from "@/db";
import { pipelineStages, deals, contacts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import type { PipelineColumn } from "@/types";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const stages = await db
    .select()
    .from(pipelineStages)
    .orderBy(asc(pipelineStages.order));

  const allDeals = await db
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
      nextHearing: deals.nextHearing,
      internalNotes: deals.internalNotes,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      contactName: contacts.name,
      contactTemperature: contacts.temperature,
      contactCaseType: contacts.caseType,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id));

  const columns: PipelineColumn[] = stages.map((stage) => ({
    ...stage,
    deals: allDeals
      .filter((d) => d.stageId === stage.id)
      .map((d) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        stageId: d.stageId,
        contactId: d.contactId,
        expectedClose: d.expectedClose,
        probability: d.probability,
        notes: d.notes,
        agreedFees: d.agreedFees,
        paidAmount: d.paidAmount,
        nextHearing: d.nextHearing,
        internalNotes: d.internalNotes,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        contactName: d.contactName,
        contactTemperature: d.contactTemperature,
        contactCaseType: d.contactCaseType,
      })) as PipelineColumn["deals"],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground">
          Arrastra y suelta casos entre etapas
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground font-medium">Tipo de causa:</span>
        {[
          { label: "Civil", color: "#3B82F6" },
          { label: "Laboral", color: "#F97316" },
          { label: "Penal", color: "#EF4444" },
          { label: "Familia", color: "#EC4899" },
          { label: "Comercial", color: "#10B981" },
          { label: "Otro", color: "#6B7280" },
        ].map((t) => (
          <span key={t.label} className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
            {t.label}
          </span>
        ))}
      </div>

      <KanbanBoard initialColumns={columns} />
    </div>
  );
}
