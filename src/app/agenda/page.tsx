"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/constants";
import { formatBusinessDaysLabel, businessDaysBetween } from "@/lib/businessDays";
import { ActivityForm } from "@/components/activities/ActivityForm";
import { toast } from "sonner";

const CASE_TYPE_LABELS: Record<string, string> = {
  civil: "Civil", laboral: "Laboral", penal: "Penal",
  familia: "Familia", comercial: "Comercial", otro: "Otro",
};

const CASE_TYPE_BG: Record<string, string> = {
  civil: "#DBEAFE", laboral: "#FED7AA", penal: "#FECACA",
  familia: "#FBCFE8", comercial: "#A7F3D0", otro: "#E5E7EB",
};

const CASE_TYPE_FG: Record<string, string> = {
  civil: "#1D4ED8", laboral: "#C2410C", penal: "#DC2626",
  familia: "#BE185D", comercial: "#047857", otro: "#4B5563",
};

const FILTERS = ["", "civil", "laboral", "penal", "familia", "comercial"];

interface Vencimiento {
  dealId: string;
  dealTitle: string;
  nextHearing: number | string | Date;
  hearingStatus: string;
  contactId: string;
  contactName: string | null;
  contactPhone: string | null;
  caseType: string | null;
  esPerentorio: boolean | number | null;
}

interface TareaItem {
  id: string;
  dealId: string;
  contactId: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  fecha: number | string | Date;
  completada: boolean | number;
  dealTitle: string | null;
  contactName: string | null;
  caseType: string | null;
}

function toDate(v: number | string | Date): Date {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);
  return new Date(v);
}

type RescheduleTarget = { kind: "deal"; dealId: string; date: string } | { kind: "tarea"; id: string; date: string };

export default function AgendaPage() {
  const router = useRouter();
  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([]);
  const [tareas, setTareas] = useState<TareaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [activityDeal, setActivityDeal] = useState<{
    dealId: string;
    contactId: string;
    contactName: string | null;
    contactPhone: string | null;
    dealTitle: string | null;
  } | null>(null);
  const [reschedule, setReschedule] = useState<RescheduleTarget | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");

  const fetchAll = useCallback(() => {
    fetch("/api/agenda").then((r) => r.json()).then((data) => {
      setVencimientos(data.vencimientos || []);
      setTareas(data.tareas || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleVencimientoAction = async (dealId: string, action: string, newDate?: string) => {
    const res = await fetch("/api/agenda", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId, action, newDate }),
    });
    if (res.ok) {
      toast.success(action === "realizada" ? "Marcada como realizada" : "Fecha reprogramada");
      fetchAll();
      router.refresh();
    } else {
      toast.error("Error al actualizar");
    }
  };

  const handleTareaComplete = async (id: string) => {
    const res = await fetch(`/api/tareas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completada: true }),
    });
    if (res.ok) {
      toast.success("Tarea completada");
      fetchAll();
    } else {
      toast.error("Error al completar tarea");
    }
  };

  const handleTareaReschedule = async (id: string, newDate: string) => {
    const res = await fetch(`/api/tareas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: newDate }),
    });
    if (res.ok) {
      toast.success("Fecha actualizada");
      fetchAll();
    } else {
      toast.error("Error al mover fecha");
    }
  };

  const openReschedule = (target: RescheduleTarget) => {
    setRescheduleDate(target.date);
    setReschedule(target);
  };

  const confirmReschedule = () => {
    if (!reschedule || !rescheduleDate) return;
    if (reschedule.kind === "deal") {
      handleVencimientoAction(reschedule.dealId, "reprogramar", rescheduleDate);
    } else {
      handleTareaReschedule(reschedule.id, rescheduleDate);
    }
    setReschedule(null);
  };

  const filteredVenc = vencimientos.filter((v) => !filter || v.caseType === filter);
  const filteredTareas = tareas.filter((t) => !filter || t.caseType === filter);

  const pendingVenc = filteredVenc.filter((v) => v.hearingStatus === "pendiente");
  const historyVenc = filteredVenc.filter((v) => v.hearingStatus !== "pendiente");

  const pendingTareas = filteredTareas.filter((t) => !t.completada);
  const historyTareas = filteredTareas.filter((t) => t.completada);

  const now = new Date();

  const hasNothing =
    pendingVenc.length === 0 &&
    pendingTareas.length === 0 &&
    historyVenc.length === 0 &&
    historyTareas.length === 0;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Agenda</h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>Vencimientos y tareas de procuracion</p>

      {/* Filtros por tipo de causa */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 16, WebkitOverflowScrolling: "touch" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flexShrink: 0, height: 40, padding: "0 16px", borderRadius: 8,
              fontSize: 14, fontWeight: 600, border: "1px solid #e2e8f0",
              background: filter === f ? "#2563eb" : "white",
              color: filter === f ? "white" : "#334155",
              cursor: "pointer",
            }}
          >
            {f === "" ? "Todas" : CASE_TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 120, background: "#f1f5f9", borderRadius: 12, marginBottom: 12 }} />
          ))}
        </div>
      ) : hasNothing ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b", fontSize: 16 }}>
          No hay actuaciones cargadas
        </div>
      ) : (
        <>
          {/* Vencimientos Judiciales (rojo) */}
          <SectionContainer
            title="Vencimientos Judiciales"
            emoji="🔴"
            count={pendingVenc.length}
            bg="#fef2f2"
            border="#fecaca"
            titleColor="#991b1b"
            badgeBg="#dc2626"
          >
            {pendingVenc.length === 0 ? (
              <EmptyMsg color="#991b1b">No hay vencimientos pendientes</EmptyMsg>
            ) : (
              pendingVenc.map((v) => (
                <VencimientoCard
                  key={v.dealId}
                  item={v}
                  now={now}
                  onRealized={() => handleVencimientoAction(v.dealId, "realizada")}
                  onReschedule={() => openReschedule({ kind: "deal", dealId: v.dealId, date: toDate(v.nextHearing).toISOString().split("T")[0] })}
                  onNota={() => setActivityDeal({
                    dealId: v.dealId,
                    contactId: v.contactId,
                    contactName: v.contactName,
                    contactPhone: v.contactPhone,
                    dealTitle: v.dealTitle,
                  })}
                />
              ))
            )}
          </SectionContainer>

          {/* Tareas de Procuracion (azul) */}
          <SectionContainer
            title="Tareas de Procuracion"
            emoji="🔵"
            count={pendingTareas.length}
            bg="#eff6ff"
            border="#bfdbfe"
            titleColor="#1e40af"
            badgeBg="#2563eb"
          >
            {pendingTareas.length === 0 ? (
              <EmptyMsg color="#1e40af">No hay tareas pendientes</EmptyMsg>
            ) : (
              pendingTareas.map((t) => (
                <TareaCard
                  key={t.id}
                  item={t}
                  now={now}
                  onCompletada={() => handleTareaComplete(t.id)}
                  onMover={() => openReschedule({ kind: "tarea", id: t.id, date: toDate(t.fecha).toISOString().split("T")[0] })}
                  onNota={() => setActivityDeal({
                    dealId: t.dealId,
                    contactId: t.contactId,
                    contactName: t.contactName,
                    contactPhone: null,
                    dealTitle: t.dealTitle,
                  })}
                />
              ))
            )}
          </SectionContainer>

          {/* Historial */}
          {(historyVenc.length > 0 || historyTareas.length > 0) && (
            <div style={{ marginTop: 32 }}>
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{ fontSize: 16, fontWeight: 600, color: "#64748b", cursor: "pointer", background: "none", border: "none", padding: "8px 0", display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}
              >
                {showHistory ? "▲" : "▼"} Historial ({historyVenc.length + historyTareas.length})
              </button>
              {showHistory && (
                <>
                  {historyVenc.map((v) => (
                    <HistoryRow
                      key={v.dealId}
                      title={v.dealTitle}
                      subtitle={v.contactName}
                      label={v.hearingStatus === "realizada" ? "Realizada" : "Cancelada"}
                      onClick={() => router.push(`/deals/${v.dealId}`)}
                    />
                  ))}
                  {historyTareas.map((t) => (
                    <HistoryRow
                      key={t.id}
                      title={t.titulo}
                      subtitle={t.contactName || t.dealTitle}
                      label="Completada"
                      onClick={() => router.push(`/deals/${t.dealId}`)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal actividad */}
      {activityDeal && (
        <ActivityForm
          open={true}
          onClose={() => { setActivityDeal(null); fetchAll(); }}
          preselectedContactId={activityDeal.contactId}
          preselectedDealId={activityDeal.dealId}
          preselectedContactName={activityDeal.contactName ?? undefined}
          preselectedContactPhone={activityDeal.contactPhone}
          preselectedDealTitle={activityDeal.dealTitle}
        />
      )}

      {/* Modal reprogramar */}
      {reschedule && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setReschedule(null)} />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, height: "85vh",
            background: "white", borderRadius: "16px 16px 0 0", zIndex: 10001,
            display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease-out",
          }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#cbd5e1" }} />
            </div>
            <div style={{ padding: "8px 20px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>
                {reschedule.kind === "deal" ? "Reprogramar vencimiento" : "Mover fecha de tarea"}
              </h3>
              <div>
                <label style={{ fontSize: 14, color: "#64748b", display: "block", marginBottom: 6 }}>Nueva fecha</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  style={{ width: "100%", height: 48, fontSize: 16, padding: "0 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                {reschedule.kind === "deal" && (
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Recordatorio: En Argentina el plazo vence a las 9:00 del dia posterior</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: "auto" }}>
                <button
                  onClick={() => setReschedule(null)}
                  style={{ flex: 1, height: 48, fontSize: 16, fontWeight: 600, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReschedule}
                  disabled={!rescheduleDate}
                  style={{ flex: 1, height: 48, fontSize: 16, fontWeight: 600, borderRadius: 8, border: "none", background: rescheduleDate ? "#2563eb" : "#94a3b8", color: "white", cursor: rescheduleDate ? "pointer" : "default" }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes perentorioPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
        }
      `}</style>
    </div>
  );
}

function SectionContainer({ title, emoji, count, bg, border, titleColor, badgeBg, children }: {
  title: string; emoji: string; count: number;
  bg: string; border: string; titleColor: string; badgeBg: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 16,
      padding: 16, marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: titleColor }}>{title}</span>
        <span style={{
          fontSize: 12, fontWeight: 700, background: badgeBg, color: "white",
          padding: "2px 10px", borderRadius: 12, marginLeft: "auto",
        }}>{count}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyMsg({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14, color, padding: "8px 4px", margin: 0, opacity: 0.7 }}>
      {children}
    </p>
  );
}

function HistoryRow({ title, subtitle, label, onClick }: {
  title: string; subtitle: string | null; label: string; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 8, opacity: 0.6, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#64748b" }}>{subtitle}</div>
      </div>
      <span style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>{label}</span>
    </div>
  );
}

function VencimientoCard({ item, now, onRealized, onReschedule, onNota }: {
  item: Vencimiento; now: Date;
  onRealized: () => void; onReschedule: () => void; onNota: () => void;
}) {
  const d = toDate(item.nextHearing);
  const days = businessDaysBetween(now, d);
  const isPast = days < 0;
  const isToday = days === 0;
  const isPerentorio = item.esPerentorio === true || item.esPerentorio === 1;
  const ct = item.caseType || "otro";
  const daysLabel = formatBusinessDaysLabel(d, now);

  return (
    <div style={{
      minHeight: 120, padding: 16, background: "white", borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 12,
      borderLeft: `4px solid ${isPast || isPerentorio ? "#dc2626" : isToday ? "#ef4444" : "#fca5a5"}`,
      border: isPerentorio ? "2px solid #dc2626" : undefined,
      animation: isPerentorio ? "perentorioPulse 2s ease-in-out infinite" : undefined,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {item.contactName || "Sin cliente"}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, padding: "4px 10px", borderRadius: 8, flexShrink: 0,
          background: isPast || isToday ? "#dc2626" : "#fee2e2",
          color: isPast || isToday ? "white" : "#991b1b",
        }}>
          {daysLabel}
        </span>
      </div>

      {isPerentorio && (
        <div style={{
          marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4,
          background: "#dc2626", color: "white", fontSize: 11, fontWeight: 800,
          padding: "3px 10px", borderRadius: 6, letterSpacing: "0.05em",
        }}>
          PERENTORIO
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 12,
          background: CASE_TYPE_BG[ct] || CASE_TYPE_BG.otro,
          color: CASE_TYPE_FG[ct] || CASE_TYPE_FG.otro,
        }}>
          {CASE_TYPE_LABELS[ct] || ct}
        </span>
        <span style={{ fontSize: 14, color: "#64748b" }}>{formatDate(d)}</span>
      </div>

      <div style={{ fontSize: 14, color: "#475569", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.dealTitle}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <ActionBtn onClick={onRealized} bg="#f0fdf4" border="#bbf7d0" color="#15803d">✓ Realizada</ActionBtn>
        <ActionBtn onClick={onReschedule} bg="#eff6ff" border="#bfdbfe" color="#1d4ed8">📅 Reprogramar</ActionBtn>
        <ActionBtn onClick={onNota} bg="#fff7ed" border="#fed7aa" color="#c2410c">📝 Nota</ActionBtn>
      </div>
    </div>
  );
}

function TareaCard({ item, now, onCompletada, onMover, onNota }: {
  item: TareaItem; now: Date;
  onCompletada: () => void; onMover: () => void; onNota: () => void;
}) {
  const d = toDate(item.fecha);
  const days = businessDaysBetween(now, d);
  const isPast = days < 0;
  const isToday = days === 0;
  const ct = item.caseType || "otro";
  const daysLabel = formatBusinessDaysLabel(d, now);

  return (
    <div style={{
      minHeight: 120, padding: 16, background: "white", borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 12,
      borderLeft: `4px solid ${isPast ? "#1d4ed8" : isToday ? "#2563eb" : "#93c5fd"}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>
          {item.titulo}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, padding: "4px 10px", borderRadius: 8, flexShrink: 0,
          background: isPast || isToday ? "#2563eb" : "#dbeafe",
          color: isPast || isToday ? "white" : "#1e40af",
        }}>
          {daysLabel}
        </span>
      </div>

      {item.descripcion && (
        <div style={{ fontSize: 14, color: "#475569", marginTop: 6, lineHeight: 1.4 }}>
          {item.descripcion}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 12,
          background: CASE_TYPE_BG[ct] || CASE_TYPE_BG.otro,
          color: CASE_TYPE_FG[ct] || CASE_TYPE_FG.otro,
        }}>
          {CASE_TYPE_LABELS[ct] || ct}
        </span>
        <span style={{ fontSize: 14, color: "#64748b" }}>{formatDate(d)}</span>
      </div>

      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.contactName} {item.dealTitle ? `· ${item.dealTitle}` : ""}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <ActionBtn onClick={onCompletada} bg="#f0fdf4" border="#bbf7d0" color="#15803d">✓ Completada</ActionBtn>
        <ActionBtn onClick={onMover} bg="#eff6ff" border="#bfdbfe" color="#1d4ed8">📅 Mover fecha</ActionBtn>
        <ActionBtn onClick={onNota} bg="#fff7ed" border="#fed7aa" color="#c2410c">📝 Nota</ActionBtn>
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, bg, border, color }: {
  children: React.ReactNode; onClick: () => void;
  bg: string; border: string; color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, height: 48, fontSize: 14, fontWeight: 600, borderRadius: 8,
        border: `1px solid ${border}`, background: bg, color, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      }}
    >
      {children}
    </button>
  );
}
