"use client";

import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { DealCard } from "./DealCard";
import { toast } from "sonner";
import type { PipelineColumn } from "@/types";
import { WhatsAppModal, buildMessage } from "@/components/whatsapp/WhatsAppModal";
import { tryNotify } from "@/lib/whatsappNotify";

interface WonNotification {
  contactName: string;
  contactPhone: string;
  dealTitle: string;
}

interface KanbanBoardProps {
  initialColumns: PipelineColumn[];
}

export function KanbanBoard({ initialColumns }: KanbanBoardProps) {
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const columnsSnapshot = useRef<PipelineColumn[]>(initialColumns);
  const [wonNotification, setWonNotification] = useState<WonNotification | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const activeDeal = activeId
    ? columns
        .flatMap((col) => col.deals)
        .find((d) => d.id === activeId)
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    columnsSnapshot.current = columns;
  }, [columns]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which columns the items are in
    const activeColumn = columns.find((col) =>
      col.deals.some((d) => d.id === activeId)
    );
    const overColumn =
      columns.find((col) => col.id === overId) ||
      columns.find((col) => col.deals.some((d) => d.id === overId));

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id)
      return;

    setColumns((prev) => {
      const activeDeal = activeColumn.deals.find((d) => d.id === activeId);
      if (!activeDeal) return prev;

      return prev.map((col) => {
        if (col.id === activeColumn.id) {
          return {
            ...col,
            deals: col.deals.filter((d) => d.id !== activeId),
          };
        }
        if (col.id === overColumn.id) {
          return {
            ...col,
            deals: [...col.deals, { ...activeDeal, stageId: col.id }],
          };
        }
        return col;
      });
    });
  }, [columns]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overColumn =
        columns.find((col) => col.id === over.id) ||
        columns.find((col) => col.deals.some((d) => d.id === over.id));

      if (!overColumn) return;

      const sourceColumn = columnsSnapshot.current.find((c) =>
        c.deals.some((d) => d.id === activeId)
      );
      const isStageChange = sourceColumn?.id !== overColumn.id;
      const movedDeal = overColumn.deals.find((d) => d.id === activeId);

      // Update the deal's stage via API
      try {
        const res = await fetch("/api/pipeline", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dealId: activeId,
            stageId: overColumn.id,
          }),
        });
        if (!res.ok) {
          throw new Error("API error");
        }

        if (
          isStageChange &&
          overColumn.isWon &&
          movedDeal?.contactPhone &&
          movedDeal.contactName
        ) {
          const contactName = movedDeal.contactName;
          const contactPhone = movedDeal.contactPhone;
          const dealTitle = movedDeal.title;
          const message = buildMessage("resolucion_favorable", {
            contactName,
            deal: { title: dealTitle, agreedFees: null, paidAmount: 0, nextHearing: null },
          });
          const sent = await tryNotify({ phone: contactPhone, message, contactName });
          if (!sent) {
            setWonNotification({ contactName, contactPhone, dealTitle });
          }
        }
      } catch {
        // Rollback to pre-drag state
        setColumns(columnsSnapshot.current);
        toast.error("Error al mover el caso. Se revirtio el cambio.");
      }
    },
    [columns]
  );

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none" style={{ WebkitOverflowScrolling: "touch" }}>
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            name={column.name}
            color={column.color}
            deals={column.deals.map((d) => ({
              id: d.id,
              title: d.title,
              value: d.value,
              contactName: d.contactName || (d.contact?.name ?? null),
              contactTemperature:
                d.contactTemperature ||
                (d.contact?.temperature ?? null),
              probability: d.probability,
              agreedFees: d.agreedFees ?? null,
              paidAmount: d.paidAmount ?? 0,
              caseType: d.caseType ?? null,
            }))}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <DealCard
            id={activeDeal.id}
            title={activeDeal.title}
            value={activeDeal.value}
            contactName={
              activeDeal.contactName ||
              (activeDeal.contact?.name ?? null)
            }
            contactTemperature={
              activeDeal.contactTemperature ||
              (activeDeal.contact?.temperature ?? null)
            }
            probability={activeDeal.probability}
            agreedFees={activeDeal.agreedFees ?? null}
            paidAmount={activeDeal.paidAmount ?? 0}
            caseType={activeDeal.caseType ?? null}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
    {wonNotification && (
      <WhatsAppModal
        open={!!wonNotification}
        onClose={() => setWonNotification(null)}
        contactName={wonNotification.contactName}
        contactPhone={wonNotification.contactPhone}
        deals={[{ title: wonNotification.dealTitle, agreedFees: null, paidAmount: 0, nextHearing: null }]}
        defaultTemplate="resolucion_favorable"
      />
    )}
    </>
  );
}
