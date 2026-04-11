"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/constants";
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
  const [rescheduleDate, setRescheduleDate] = useState("");

  const fetchItems = useCallback(() => {
    fetch("/api/agenda").then((r) => r.json()).then((data) => { setItems(data); setLoading(false); });
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
      toast.success(action === "realizada" ? "Marcada como realizada" : action === "cancelada" ? "Actuacion cancelada" : "Fecha reprogramada");
      fetchItems();
      router.refresh();
    } else {
      toast.error("Error al actualizar");
    }
  };

  const openReschedule = (dealId: string, date: string) => {
    setRescheduleDate(date);
    setReschedule({ dealId, currentDate: date });
  };

  const confirmReschedule = () => {
    if (reschedule && rescheduleDate) {
      handleAction(reschedule.dealId, "reprogramar", rescheduleDate);
      setReschedule(null);
    }
  };

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);

  const filtered = items.filter((i) => !filter || i.caseType === filter);
  const pending = filtered.filter((i) => i.hearingStatus === "pendiente");
  const history = filtered.filter((i) => i.hearingStatus !== "pendiente");

  const todayItems = pending.filter((i) => { const d = toDate(i.nextHearing); return d >= startOfDay && d < endOfDay; });
  const overdueItems = pending.filter((i) => toDate(i.nextHearing) < startOfDay);
  const futureItems = pending.filter((i) => toDate(i.nextHearing) >= endOfDay);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Agenda</h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>Fechas de actuacion</p>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 16, WebkitOverflowScrolling: "touch" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flexShrink: 0,
              height: 40,
              padding: "0 16px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: "1px solid #e2e8f0",
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
      ) : pending.length === 0 && history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b", fontSize: 16 }}>
          No hay fechas de actuacion cargadas
        </div>
      ) : (
        <div>
          {todayItems.length > 0 && (
            <Section title="Hoy" count={todayItems.length} barColor="#2563eb" titleColor="#1d4ed8">
              {todayItems.map((item) => (
                <AgendaCard key={item.dealId} item={item} variant="today" now={now}
                  onRealized={() => handleAction(item.dealId, "realizada")}
                  onReschedule={() => openReschedule(item.dealId, toDate(item.nextHearing).toISOString().split("T")[0])}
                  onActivity={() => setActivityDeal({ dealId: item.dealId, contactId: item.contactId })}
                  onCancel={() => handleAction(item.dealId, "cancelada")}
                />
              ))}
            </Section>
          )}

          {overdueItems.length > 0 && (
            <Section title="Vencidas" count={overdueItems.length} barColor="#dc2626" titleColor="#b91c1c">
              {overdueItems.map((item) => (
                <AgendaCard key={item.dealId} item={item} variant="overdue" now={now}
                  onRealized={() => handleAction(item.dealId, "realizada")}
                  onReschedule={() => openReschedule(item.dealId, toDate(item.nextHearing).toISOString().split("T")[0])}
                  onActivity={() => setActivityDeal({ dealId: item.dealId, contactId: item.contactId })}
                  onCancel={() => handleAction(item.dealId, "cancelada")}
                />
              ))}
            </Section>
          )}

          {futureItems.length > 0 && (
            <Section title="Proximas" count={futureItems.length} barColor="#94a3b8" titleColor="#334155">
              {futureItems.map((item) => {
                const days = Math.ceil((toDate(item.nextHearing).getTime() - now.getTime()) / 86400000);
                return (
                  <AgendaCard key={item.dealId} item={item} variant={days <= 3 ? "urgent" : "normal"} now={now}
                    onRealized={() => handleAction(item.dealId, "realizada")}
                    onReschedule={() => openReschedule(item.dealId, toDate(item.nextHearing).toISOString().split("T")[0])}
                    onActivity={() => setActivityDeal({ dealId: item.dealId, contactId: item.contactId })}
                    onCancel={() => handleAction(item.dealId, "cancelada")}
                  />
                );
              })}
            </Section>
          )}

          {history.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{ fontSize: 16, fontWeight: 600, color: "#64748b", cursor: "pointer", background: "none", border: "none", padding: "8px 0", display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}
              >
                {showHistory ? "▲" : "▼"} Historial ({history.length})
              </button>
              {showHistory && history.map((item) => (
                <div
                  key={item.dealId}
                  onClick={() => router.push(`/deals/${item.dealId}`)}
                  style={{ padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 8, opacity: 0.6, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{item.dealTitle}</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>{item.contactName}</div>
                  </div>
                  <span style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                    {item.hearingStatus === "realizada" ? "Realizada" : "Cancelada"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal actividad */}
      {activityDeal && (
        <ActivityForm
          open={true}
          onClose={() => { setActivityDeal(null); fetchItems(); }}
          preselectedContactId={activityDeal.contactId}
          preselectedDealId={activityDeal.dealId}
        />
      )}

      {/* Modal reprogramar - bottom sheet */}
      {reschedule && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
            onClick={() => setReschedule(null)}
          />
          <div style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "85vh",
            background: "white",
            borderRadius: "16px 16px 0 0",
            zIndex: 10001,
            display: "flex",
            flexDirection: "column",
            animation: "slideUp 0.3s ease-out",
          }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#cbd5e1" }} />
            </div>
            <div style={{ padding: "8px 20px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>Reprogramar actuacion</h3>
              <div>
                <label style={{ fontSize: 14, color: "#64748b", display: "block", marginBottom: 6 }}>Nueva fecha</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  style={{ width: "100%", height: 48, fontSize: 16, padding: "0 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
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
      `}</style>
    </div>
  );
}

function Section({ title, count, barColor, titleColor, children }: {
  title: string; count: number; barColor: string; titleColor: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 4, height: 24, borderRadius: 4, background: barColor }} />
        <span style={{ fontSize: 17, fontWeight: 700, color: titleColor }}>{title}</span>
        <span style={{ fontSize: 12, fontWeight: 600, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 10 }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function AgendaCard({ item, variant, now, onRealized, onReschedule, onActivity, onCancel }: {
  item: AgendaItem;
  variant: "today" | "overdue" | "urgent" | "normal";
  now: Date;
  onRealized: () => void;
  onReschedule: () => void;
  onActivity: () => void;
  onCancel: () => void;
}) {
  const d = toDate(item.nextHearing);
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);

  const daysLabel = variant === "overdue"
    ? `Hace ${Math.abs(days)} dia${Math.abs(days) !== 1 ? "s" : ""}`
    : variant === "today" ? "Hoy"
    : days === 1 ? "Manana"
    : `En ${days} dias`;

  const daysLabelBg = (variant === "overdue" || variant === "urgent") ? "#dc2626" : variant === "today" ? "#2563eb" : "#f1f5f9";
  const daysLabelFg = (variant === "overdue" || variant === "urgent" || variant === "today") ? "white" : "#64748b";

  const borderLeft = variant === "today" ? "#3b82f6" : (variant === "overdue" || variant === "urgent") ? "#ef4444" : "#d1d5db";
  const cardBg = variant === "today" ? "#eff6ff" : "white";

  const ct = item.caseType || "otro";

  return (
    <div style={{
      minHeight: 120,
      padding: 16,
      background: cardBg,
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      marginBottom: 12,
      borderLeft: `4px solid ${borderLeft}`,
    }}>
      {/* Linea 1: nombre cliente */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {item.contactName || "Sin cliente"}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, padding: "4px 10px", borderRadius: 8, flexShrink: 0,
          background: daysLabelBg, color: daysLabelFg,
        }}>
          {daysLabel}
        </span>
      </div>

      {/* Linea 2: tipo de causa + fecha */}
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

      {/* Linea 3: titulo caso */}
      <div style={{ fontSize: 14, color: "#475569", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.dealTitle}
      </div>

      {/* Linea 4: 3 botones de accion en row */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={onRealized}
          style={{
            flex: 1, height: 48, fontSize: 15, fontWeight: 600, borderRadius: 8, border: "1px solid #bbf7d0",
            background: "#f0fdf4", color: "#15803d", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          ✓ Realizada
        </button>
        <button
          onClick={onReschedule}
          style={{
            flex: 1, height: 48, fontSize: 15, fontWeight: 600, borderRadius: 8, border: "1px solid #bfdbfe",
            background: "#eff6ff", color: "#1d4ed8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          📅 Reprogramar
        </button>
        <button
          onClick={onActivity}
          style={{
            flex: 1, height: 48, fontSize: 15, fontWeight: 600, borderRadius: 8, border: "1px solid #fed7aa",
            background: "#fff7ed", color: "#c2410c", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          📝 Actividad
        </button>
      </div>
    </div>
  );
}
