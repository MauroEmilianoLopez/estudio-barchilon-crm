"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Check } from "lucide-react";
import { formatDate } from "@/lib/constants";
import { formatBusinessDaysLabel, businessDaysBetween } from "@/lib/businessDays";
import { toast } from "sonner";
import { WhatsAppModal, buildMessage } from "@/components/whatsapp/WhatsAppModal";
import { tryNotify } from "@/lib/whatsappNotify";

interface Tarea {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  fecha: number | string | Date;
  completada: boolean | number;
}

function toDate(v: number | string | Date): Date {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);
  return new Date(v);
}

interface DealTareasSectionProps {
  dealId: string;
  dealTitle: string;
  contactName: string;
  contactPhone: string | null;
}

export function DealTareasSection({ dealId, dealTitle, contactName, contactPhone }: DealTareasSectionProps) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [completedTaskTitle, setCompletedTaskTitle] = useState("");

  const fetchTareas = useCallback(async () => {
    const res = await fetch(`/api/tareas?dealId=${dealId}&completada=false`);
    if (res.ok) {
      const data = await res.json();
      setTareas(data);
    }
    setLoading(false);
  }, [dealId]);

  useEffect(() => { fetchTareas(); }, [fetchTareas]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !fecha) {
      toast.error("Titulo y fecha son requeridos");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          tipo: "tarea_procuracion",
          titulo,
          descripcion: descripcion || null,
          fecha,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tarea agregada");
      setTitulo("");
      setDescripcion("");
      setFecha("");
      setShowForm(false);
      fetchTareas();
    } catch {
      toast.error("Error al crear tarea");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string, tareaTitulo: string) => {
    const res = await fetch(`/api/tareas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completada: true }),
    });
    if (res.ok) {
      toast.success("Tarea completada");
      fetchTareas();
      if (contactPhone) {
        setCompletedTaskTitle(tareaTitulo);
        const message = buildMessage("tarea_realizada", {
          contactName,
          deal: { title: dealTitle, agreedFees: null, paidAmount: 0, nextHearing: null },
          completedTaskTitle: tareaTitulo,
        });
        const sent = await tryNotify({ phone: contactPhone, message, contactName });
        if (!sent) setWhatsappOpen(true);
      }
    } else {
      toast.error("Error al completar tarea");
    }
  };

  const now = new Date();

  return (
    <Card style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2" style={{ color: "#1e40af" }}>
          <span>🔵</span>
          Tareas de procuracion
          <span className="text-xs font-bold rounded-full px-2 py-0.5 text-white" style={{ background: "#2563eb" }}>
            {tareas.length}
          </span>
        </CardTitle>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="cursor-pointer"
          style={{ background: "#2563eb", color: "white" }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar tarea
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleCreate} className="space-y-3 p-3 mb-3 rounded-lg bg-white border" style={{ borderColor: "#bfdbfe" }}>
            <div className="space-y-1">
              <Label htmlFor="tarea-titulo">Titulo *</Label>
              <Input
                id="tarea-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Llamar a tribunales"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tarea-desc">Descripcion</Label>
              <Textarea
                id="tarea-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                placeholder="Detalles opcionales..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tarea-fecha">Fecha *</Label>
              <Input
                id="tarea-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="cursor-pointer">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="cursor-pointer" style={{ background: "#2563eb", color: "white" }}>
                {submitting ? "Creando..." : "Crear tarea"}
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: "#1e40af", opacity: 0.6 }}>Cargando...</p>
        ) : tareas.length === 0 ? (
          <p className="text-sm" style={{ color: "#1e40af", opacity: 0.7 }}>
            No hay tareas pendientes para este caso
          </p>
        ) : (
          <div className="space-y-2">
            {tareas.map((t) => {
              const d = toDate(t.fecha);
              const days = businessDaysBetween(now, d);
              const label = formatBusinessDaysLabel(d, now);
              const urgent = days <= 0;
              return (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white border"
                  style={{ borderColor: "#bfdbfe" }}
                >
                  <button
                    onClick={() => handleComplete(t.id, t.titulo)}
                    className="shrink-0 mt-0.5 h-7 w-7 rounded-full border flex items-center justify-center cursor-pointer hover:bg-green-50"
                    style={{ borderColor: "#bfdbfe" }}
                    title="Completar tarea"
                  >
                    <Check className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{t.titulo}</p>
                    {t.descripcion && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.descripcion}</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: urgent ? "#1e40af" : "#64748b" }}>
                      {formatDate(d)} · <span className={urgent ? "font-bold" : ""}>{label}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      {contactPhone && (
        <WhatsAppModal
          open={whatsappOpen}
          onClose={() => setWhatsappOpen(false)}
          contactName={contactName}
          contactPhone={contactPhone}
          deals={[{ title: dealTitle, agreedFees: null, paidAmount: 0, nextHearing: null }]}
          defaultTemplate="tarea_realizada"
          completedTaskTitle={completedTaskTitle}
        />
      )}
    </Card>
  );
}
