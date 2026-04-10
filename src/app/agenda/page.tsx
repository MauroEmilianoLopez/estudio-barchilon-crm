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
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Fechas de actuacion de todos los casos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          variant={filter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("")}
          className="cursor-pointer shrink-0"
        >
          Todas
        </Button>
        {CASE_TYPE_FILTERS.map((ct) => (
          <Button
            key={ct}
            variant={filter === ct ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(ct)}
            className="cursor-pointer shrink-0"
          >
            {CASE_TYPE_LABELS[ct]}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : pending.length === 0 && history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-base text-muted-foreground">
              No hay fechas de actuacion cargadas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* HOY */}
          {todayItems.length > 0 && (
            <Section title="Hoy" count={todayItems.length} color="text-blue-700">
              <div className="space-y-3">
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
              </div>
            </Section>
          )}

          {/* VENCIDAS */}
          {overdueItems.length > 0 && (
            <Section title="Vencidas" count={overdueItems.length} color="text-red-700">
              <div className="space-y-3">
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
              </div>
            </Section>
          )}

          {/* PROXIMAS */}
          {futureItems.length > 0 && (
            <Section title="Proximas" count={futureItems.length} color="text-muted-foreground">
              <div className="space-y-3">
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
              </div>
            </Section>
          )}

          {/* HISTORIAL */}
          {history.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2 cursor-pointer"
              >
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Historial ({history.length})
              </button>
              {showHistory && (
                <div className="space-y-2">
                  {history.map((item) => (
                    <Link key={item.dealId} href={`/deals/${item.dealId}`}>
                      <Card className="opacity-60 hover:opacity-80 transition-opacity cursor-pointer">
                        <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.dealTitle}</p>
                            <p className="text-xs text-muted-foreground">{item.contactName}</p>
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

      {/* Modal registrar actividad */}
      {activityDeal && (
        <ActivityForm
          open={true}
          onClose={() => { setActivityDeal(null); fetchItems(); }}
          preselectedContactId={activityDeal.contactId}
          preselectedDealId={activityDeal.dealId}
        />
      )}

      {/* Modal reprogramar */}
      {reschedule && (
        <RescheduleModal
          currentDate={reschedule.currentDate}
          onConfirm={(newDate) => {
            handleAction(reschedule.dealId, "reprogramar", newDate);
            setReschedule(null);
          }}
          onClose={() => setReschedule(null)}
        />
      )}
    </div>
  );
}

function Section({ title, count, color, children }: { title: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className={`text-sm font-semibold ${color} mb-2`}>{title} ({count})</h2>
      {children}
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
    "border-l-muted-foreground";

  const bgColor = variant === "today" ? "bg-blue-50/50" : "";

  return (
    <Card className={`border-l-4 ${borderColor} ${bgColor}`}>
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/deals/${item.dealId}`} className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate">{item.dealTitle}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {item.contactName || "Sin cliente"}
              {item.caseType && (
                <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded bg-muted">
                  {CASE_TYPE_LABELS[item.caseType] || item.caseType}
                </span>
              )}
            </p>
          </Link>
          <div className="text-right shrink-0">
            <p className="text-sm font-medium">{formatDate(d)}</p>
            {variant === "overdue" ? (
              <Badge variant="destructive" className="text-xs mt-1">
                Hace {Math.abs(days)} dia{Math.abs(days) !== 1 ? "s" : ""}
              </Badge>
            ) : variant === "today" ? (
              <Badge className="text-xs mt-1 bg-blue-600">Hoy</Badge>
            ) : days <= 3 ? (
              <Badge variant="destructive" className="text-xs mt-1">
                {days === 1 ? "Manana" : `En ${days} dias`}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs mt-1">En {days} dias</Badge>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer text-green-700 border-green-200 hover:bg-green-50 flex-1 min-w-0"
            onClick={() => onAction(item.dealId, "realizada")}
          >
            <Check className="h-4 w-4 mr-1 shrink-0" />
            <span className="truncate">Realizada</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer flex-1 min-w-0"
            onClick={() => onReschedule(item.dealId)}
          >
            <CalendarDays className="h-4 w-4 mr-1 shrink-0" />
            <span className="truncate">Reprogramar</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer flex-1 min-w-0"
            onClick={onActivity}
          >
            <FileText className="h-4 w-4 mr-1 shrink-0" />
            <span className="truncate">Actividad</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => onAction(item.dealId, "cancelada")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RescheduleModal({ currentDate, onConfirm, onClose }: { currentDate: string; onConfirm: (d: string) => void; onClose: () => void }) {
  const [date, setDate] = useState(currentDate);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center" style={{ zIndex: 9998 }}>
      <div className="bg-card w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold">Reprogramar actuacion</h3>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-base"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 cursor-pointer">
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(date)} className="flex-1 cursor-pointer" disabled={!date}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}
