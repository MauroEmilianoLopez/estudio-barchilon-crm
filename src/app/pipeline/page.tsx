import { db } from "@/db";
import { pipelineStages, deals, contacts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { PipelineTabs } from "@/components/pipeline/PipelineTabs";
import type { PipelineColumn, PipelineType } from "@/types";

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
      esPerentorio: deals.esPerentorio,
      caseType: deals.caseType,
      caseNumber: deals.caseNumber,
      court: deals.court,
      caseStartDate: deals.caseStartDate,
      pipelineType: deals.pipelineType,
      organismo: deals.organismo,
      contactName: contacts.name,
      contactTemperature: contacts.temperature,
      contactPhone: contacts.phone,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id));

  function buildColumns(type: PipelineType): PipelineColumn[] {
    return stages
      .filter((s) => s.pipelineType === type)
      .map((stage) => ({
        ...stage,
        pipelineType: stage.pipelineType as PipelineType,
        deals: allDeals
          .filter((d) => d.stageId === stage.id && d.pipelineType === type)
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
            esPerentorio: d.esPerentorio,
            caseType: d.caseType,
            caseNumber: d.caseNumber,
            court: d.court,
            caseStartDate: d.caseStartDate,
            internalNotes: d.internalNotes,
            pipelineType: d.pipelineType as PipelineType,
            organismo: d.organismo,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            contactName: d.contactName,
            contactTemperature: d.contactTemperature,
            contactPhone: d.contactPhone,
          })) as PipelineColumn["deals"],
      }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground">
          Arrastra y suelta casos entre etapas
        </p>
      </div>

      <PipelineTabs
        judicial={buildColumns("judicial")}
        administrativo={buildColumns("administrativo")}
      />
    </div>
  );
}
