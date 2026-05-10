"use client";

import { useState } from "react";
import { KanbanBoard } from "./KanbanBoard";
import type { PipelineColumn, PipelineType } from "@/types";

interface PipelineTabsProps {
  judicial: PipelineColumn[];
  administrativo: PipelineColumn[];
}

const CASE_TYPE_LEGEND = [
  { label: "Civil", color: "#3B82F6" },
  { label: "Laboral", color: "#F97316" },
  { label: "Penal", color: "#EF4444" },
  { label: "Familia", color: "#EC4899" },
  { label: "Comercial", color: "#10B981" },
  { label: "Otro", color: "#6B7280" },
];

export function PipelineTabs({ judicial, administrativo }: PipelineTabsProps) {
  const [tab, setTab] = useState<PipelineType>("judicial");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("judicial")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            tab === "judicial"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Judicial
          <span className="ml-2 text-xs text-muted-foreground">
            {judicial.reduce((sum, c) => sum + c.deals.length, 0)}
          </span>
        </button>
        <button
          onClick={() => setTab("administrativo")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            tab === "administrativo"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          style={tab === "administrativo" ? { borderBottomColor: "#f59e0b", color: "#b45309" } : undefined}
        >
          Administrativo
          <span className="ml-2 text-xs text-muted-foreground">
            {administrativo.reduce((sum, c) => sum + c.deals.length, 0)}
          </span>
        </button>
      </div>

      {tab === "judicial" && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground font-medium">Tipo de causa:</span>
          {CASE_TYPE_LEGEND.map((t) => (
            <span key={t.label} className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
              {t.label}
            </span>
          ))}
        </div>
      )}

      <KanbanBoard
        key={tab}
        initialColumns={tab === "judicial" ? judicial : administrativo}
      />
    </div>
  );
}
