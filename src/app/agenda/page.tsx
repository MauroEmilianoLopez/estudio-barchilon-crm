"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CalendarClock,
  Check,
  X,
  CalendarDays,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDate } from "@/lib/constants";
import { ActivityForm } from "@/components/activities/ActivityForm";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { toast } from "sonner";
import Link from "next/link";

const CASE_TYPE_LABELS: Record<string, string> = {
  civil: "Civil",
  laboral: "Laboral",
  penal: "Penal",
  familia: "Familia",
  comercial: "Comercial",
  otro: "Otro",
};

const CASE_TYPE_COLORS: Record<string, string> = {
  civil: "bg-blue-100 text-blue-700",
  laboral: "bg-orange-100 text-orange-700",
  penal: "bg-red-100 text-red-700",
  familia: "bg-pink-100 text-pink-700",
  comercial: "bg-emerald-100 text-emerald-700",
  otro: "bg-gray-100 text-gray-700",
};

const CASE_TYPE_FILTERS = ["civil", "laboral", "penal", "familia", "comercial"];

interface AgendaItem {
  dealId: string;
  dealTitle: string;
  nextHearing: number | string | Date;
  hearingStatus: string;
  contactId: string;
  contactName: string | null;
  contactPhone: string | null;
  caseType: string | null;
}

function toDate(v: number | string | Date): Date {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);
  return new Date(v);
}

export default function AgendaPage() {
  const router = useRouter();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [activityDeal, setActivityDeal] = useState<{ dealId: string; contactId: string } | null>(null);
  const [reschedule, setReschedule] = useState<{ dealId: string; currentDate: string } | null>(null);

  const fetchItems = useCallback(() => {
    fetch("/api/agenda")
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false); });
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAction = async (dealId: string, action: string, newDate?: string) => {
    if (action === "cancelada" && !confirm("Cancelar esta actuacion?")) return;

    const res = await fetch("/api/agenda", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId, action, newDate }),
    });

    if (res.ok) {
      toast.success(
        action === "realizada" ? "Marcada como realizada" :
        action === "cancelada" ? "Actuacion cancelada" :
        "Fecha reprogramada"
      );
      fetchItems();
      router.refresh();
    } else {
      toast.error("Error al actualizar");
    }
  };

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);

  const filtered = items.filter((i) => !filter || i.caseType === filter);
  const pending = filtered.filter((i) => i.hearingStatus === "pendiente");
  const history = filtered.filter((i) => i.hearingStatus !== "pendiente");

  const todayItems = pending.filter((i) => {
    const d = toDate(i.nextHearing);
    return d >= startOfDay && d < endOfDay;
  });
  const futureItems = pending.filter((i) => toDate(i.nextHearing) >= endOfDay);
  const overdueItems = pending.filter((i) => toDate(i.nextHearing) < startOfDay);

  return (
    <div className="space-y-5 pb-4">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Agenda</h1>
        <p className="text-sm text-muted-foreground hidden sm:block">Fechas de actuacion de todos los casos</p>
      </div>

      {/* Filtros - scroll horizontal, no wrap */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-none">
        <Button
          variant={filter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("")}
          className="cursor-pointer shrink-0 min-h-[40px] px-4"
        >
          Todas
        </Button>
        {CASE_TYPE_FILTERS.map((ct) => (
          <Button
            key={ct}
            variant={filter === ct ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(ct)}
            className="cursor-pointer shrink-0 min-h-[40px] px-4"
          >
            {CASE_TYPE_LABELS[ct]}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : pending.length === 0 && history.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-base text-muted-foreground">
              No hay fechas de actuacion cargadas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {todayItems.length > 0 && (
            <SectionHeader title="Hoy" count={todayItems.length} color="text-blue-700" bg="bg-blue-600">
              {todayItems.map((item) => (
                <AgendaCard
                  key={item.dealId}
                  item={item}
                  variant="today"
                  onAction={handleAction}
                  onActivity={() => setActivityDeal({ dealId: item.dealId, contactId: item.contactId })}
                  onReschedule={(id) => setReschedule({ dealId: id, currentDate: toDate(item.nextHearing).toISOString().split("T")[0] })}
                />
              ))}
            </SectionHeader>
          )}

          {overdueItems.length > 0 && (
            <SectionHeader title="Vencidas" count={overdueItems.length} color="text-red-700" bg="bg-red-600">
              {overdueItems.map((item) => (
                <AgendaCard
                  key={item.dealId}
                  item={item}
                  variant="overdue"
                  onAction={handleAction}
                  onActivity={() => setActivityDeal({ dealId: item.dealId, contactId: item.contactId })}
                  onReschedule={(id) => setReschedule({ dealId: id, currentDate: toDate(item.nextHearing).toISOString().split("T")[0] })}
                />
              ))}
            </SectionHeader>
          )}

          {futureItems.length > 0 && (
            <SectionHeader title="Proximas" count={futureItems.length} color="text-foreground" bg="bg-muted-foreground">
              {futureItems.map((item) => {
                const days = Math.ceil((toDate(item.nextHearing).getTime() - now.getTime()) / 86400000);
                return (
                  <AgendaCard
                    key={item.dealId}
                    item={item}
                    variant={days <= 3 ? "urgent" : "normal"}
                    onAction={handleAction}
                    onActivity={() => setActivityDeal({ dealId: item.dealId, contactId: item.contactId })}
                    onReschedule={(id) => setReschedule({ dealId: id, currentDate: toDate(item.nextHearing).toISOString().split("T")[0] })}
                  />
                );
              })}
            </SectionHeader>
          )}

          {history.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-base font-semibold text-muted-foreground mb-3 cursor-pointer min-h-[44px]"
              >
                {showHistory ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                Historial ({history.length})
              </button>
              {showHistory && (
                <div className="space-y-2">
                  {history.map((item) => (
                    <Link key={item.dealId} href={`/deals/${item.dealId}`}>
                      <Card className="opacity-60 hover:opacity-80 active:opacity-90 transition-opacity cursor-pointer">
                        <CardContent className="py-4 px-4 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-medium truncate">{item.dealTitle}</p>
                            <p className="text-sm text-muted-foreground">{item.contactName}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {item.hearingStatus === "realizada" ? "Realizada" : "Cancelada"}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activityDeal && (
        <ActivityForm
          open={true}
          onClose={() => { setActivityDeal(null); fetchItems(); }}
          preselectedContactId={activityDeal.contactId}
          preselectedDealId={activityDeal.dealId}
        />
      )}

      <BottomSheet
        open={!!reschedule}
        onClose={() => setReschedule(null)}
        title="Reprogramar actuacion"
      >
        {reschedule && (
          <RescheduleForm
            currentDate={reschedule.currentDate}
            onConfirm={(newDate) => {
              handleAction(reschedule.dealId, "reprogramar", newDate);
              setReschedule(null);
            }}
            onClose={() => setReschedule(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function SectionHeader({ title, count, color, bg, children }: {
  title: string; count: number; color: string; bg: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-6 rounded-full ${bg}`} />
        <h2 className={`text-base md:text-lg font-bold ${color}`}>{title}</h2>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface AgendaCardProps {
  item: AgendaItem;
  variant: "today" | "overdue" | "urgent" | "normal";
  onAction: (dealId: string, action: string) => void;
  onActivity: () => void;
  onReschedule: (dealId: string) => void;
}

function AgendaCard({ item, variant, onAction, onActivity, onReschedule }: AgendaCardProps) {
  const d = toDate(item.nextHearing);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);

  const borderColor =
    variant === "today" ? "border-l-blue-500" :
    variant === "overdue" || variant === "urgent" ? "border-l-red-500" :
    "border-l-gray-300";

  const bgColor = variant === "today" ? "bg-blue-50/60" : "";
  const caseColor = CASE_TYPE_COLORS[item.caseType || "otro"] || CASE_TYPE_COLORS.otro;

  const daysLabel =
    variant === "overdue"
      ? `Hace ${Math.abs(days)} dia${Math.abs(days) !== 1 ? "s" : ""}`
      : variant === "today"
        ? "Hoy"
        : days === 1
          ? "Manana"
          : `En ${days} dias`;

  const daysColor =
    variant === "overdue" || variant === "urgent"
      ? "bg-red-600 text-white"
      : variant === "today"
        ? "bg-blue-600 text-white"
        : "bg-muted text-muted-foreground";

  return (
    <Card className={`border-l-4 ${borderColor} ${bgColor} active:shadow-md transition-shadow`}>
      <CardContent className="p-4 md:p-5">
        {/* Header: cliente + badge dias */}
        <div className="flex items-start justify-between gap-3">
          <Link href={`/deals/${item.dealId}`} className="flex-1 min-w-0">
            <p className="text-lg md:text-base font-bold leading-snug truncate">
              {item.contactName || "Sin cliente"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{item.dealTitle}</p>
          </Link>
          <span className={`text-xs font-bold px-2.5 py-1.5 rounded-lg shrink-0 ${daysColor}`}>
            {daysLabel}
          </span>
        </div>

        {/* Fecha + tipo de causa */}
        <div className="flex items-center gap-2 mt-3">
          <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">{formatDate(d)}</span>
          {item.caseType && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${caseColor}`}>
              {CASE_TYPE_LABELS[item.caseType] || item.caseType}
            </span>
          )}
        </div>

        {/* Acciones: grid 2x2 en mobile, flex en desktop */}
        <div className="grid grid-cols-2 md:flex gap-2 mt-4">
          <Button
            variant="outline"
            className="cursor-pointer text-green-700 border-green-200 hover:bg-green-50 active:bg-green-100 min-h-[44px] text-sm font-medium"
            onClick={() => onAction(item.dealId, "realizada")}
          >
            <Check className="h-4 w-4 mr-1.5 shrink-0" />
            Realizada
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer active:bg-muted min-h-[44px] text-sm font-medium"
            onClick={() => onReschedule(item.dealId)}
          >
            <CalendarDays className="h-4 w-4 mr-1.5 shrink-0" />
            Reprogramar
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer active:bg-muted min-h-[44px] text-sm font-medium"
            onClick={onActivity}
          >
            <FileText className="h-4 w-4 mr-1.5 shrink-0" />
            Actividad
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer text-destructive border-destructive/30 hover:bg-destructive/5 active:bg-destructive/10 min-h-[44px] text-sm font-medium"
            onClick={() => onAction(item.dealId, "cancelada")}
          >
            <X className="h-4 w-4 mr-1.5 shrink-0" />
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RescheduleForm({ currentDate, onConfirm, onClose }: {
  currentDate: string;
  onConfirm: (d: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(currentDate);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Nueva fecha</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1 cursor-pointer min-h-[48px] text-base">
          Cancelar
        </Button>
        <Button onClick={() => onConfirm(date)} className="flex-1 cursor-pointer min-h-[48px] text-base" disabled={!date}>
          Confirmar
        </Button>
      </div>
    </div>
  );
}
