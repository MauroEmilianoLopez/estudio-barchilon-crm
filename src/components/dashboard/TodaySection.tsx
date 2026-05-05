"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";
import Link from "next/link";

interface VencimientoHoy {
  dealId: string;
  dealTitle: string;
  contactName: string | null;
  esPerentorio: boolean | number | null;
}

interface TareaHoy {
  id: string;
  dealId: string;
  titulo: string;
  contactName: string | null;
}

interface StaleContactItem {
  id: string;
  name: string;
  daysSinceActivity: number;
}

interface OverduePaymentItem {
  dealId: string;
  dealTitle: string;
  contactName: string | null;
  pending: number;
}

interface ProspectoStaleItem {
  dealId: string;
  dealTitle: string;
  contactName: string | null;
  days: number;
}

interface TodaySectionProps {
  vencimientosHoy: VencimientoHoy[];
  tareasHoy: TareaHoy[];
}

export function TodaySection({ vencimientosHoy, tareasHoy }: TodaySectionProps) {
  if (vencimientosHoy.length === 0 && tareasHoy.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Hoy</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VencimientosHoyCard items={vencimientosHoy} />
        <TareasHoyCard items={tareasHoy} />
      </div>
    </div>
  );
}

function VencimientosHoyCard({ items }: { items: VencimientoHoy[] }) {
  return (
    <Card style={{ background: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderTopWidth: 4, borderTopColor: "#dc2626" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2" style={{ color: "#991b1b" }}>
          <span>🔴</span>
          Vencimientos de hoy
          <span className="ml-auto text-sm font-bold rounded-full px-2 py-0.5 text-white" style={{ background: "#dc2626" }}>
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm" style={{ color: "#991b1b", opacity: 0.7 }}>Sin vencimientos hoy</p>
        ) : (
          <div className="space-y-2">
            {items.map((v) => (
              <Link
                key={v.dealId}
                href={`/deals/${v.dealId}`}
                className="block p-3 rounded-lg bg-white border transition-colors hover:bg-red-50"
                style={{ borderColor: "#fecaca", minHeight: 52 }}
              >
                <p className="text-sm font-semibold" style={{ color: "#1f2937" }}>
                  {v.contactName || "Sin cliente"}
                  {(v.esPerentorio === true || v.esPerentorio === 1) && (
                    <span className="ml-2 text-[10px] font-extrabold tracking-wider rounded px-1.5 py-0.5 text-white" style={{ background: "#dc2626" }}>
                      PERENTORIO
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground truncate">{v.dealTitle}</p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProspectoStaleSection({ items }: { items: ProspectoStaleItem[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Hoy</h2>
      <Card style={{ background: "#fffbeb", borderColor: "#fde68a", borderWidth: 1, borderTopWidth: 4, borderTopColor: "#f59e0b" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2" style={{ color: "#92400e" }}>
            <span>⚠️</span>
            Prospectos sin contacto
            <span className="ml-auto text-sm font-bold rounded-full px-2 py-0.5 text-white" style={{ background: "#f59e0b" }}>
              {items.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.map((p) => (
              <Link
                key={p.dealId}
                href={`/deals/${p.dealId}`}
                className="block p-3 rounded-lg bg-white border transition-colors hover:bg-amber-50"
                style={{ borderColor: "#fde68a", minHeight: 52 }}
              >
                <p className="text-sm font-semibold" style={{ color: "#1f2937" }}>
                  {p.contactName || "Sin cliente"} lleva {p.days} {p.days === 1 ? "día hábil" : "días hábiles"} sin contacto
                </p>
                <p className="text-xs text-muted-foreground truncate">{p.dealTitle}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TareasHoyCard({ items }: { items: TareaHoy[] }) {
  return (
    <Card style={{ background: "#eff6ff", borderColor: "#bfdbfe", borderWidth: 1, borderTopWidth: 4, borderTopColor: "#2563eb" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2" style={{ color: "#1e40af" }}>
          <span>🔵</span>
          Tareas de procuracion
          <span className="ml-auto text-sm font-bold rounded-full px-2 py-0.5 text-white" style={{ background: "#2563eb" }}>
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm" style={{ color: "#1e40af", opacity: 0.7 }}>Sin tareas para hoy</p>
        ) : (
          <div className="space-y-2">
            {items.map((t) => (
              <Link
                key={t.id}
                href={`/deals/${t.dealId}`}
                className="block p-3 rounded-lg bg-white border transition-colors hover:bg-blue-50"
                style={{ borderColor: "#bfdbfe", minHeight: 52 }}
              >
                <p className="text-sm font-semibold" style={{ color: "#1f2937" }}>{t.titulo}</p>
                <p className="text-xs text-muted-foreground truncate">{t.contactName || "Sin cliente"}</p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface OtherPendingProps {
  staleContacts: StaleContactItem[];
  overduePayments: OverduePaymentItem[];
}

export function OtherPendingSection({ staleContacts, overduePayments }: OtherPendingProps) {
  if (staleContacts.length === 0 && overduePayments.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Otros pendientes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StaleContactsCard contacts={staleContacts} />
        <OverduePaymentsCard payments={overduePayments} />
      </div>
    </div>
  );
}

function StaleContactsCard({ contacts }: { contacts: StaleContactItem[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  const handleQuickNote = async (contactId: string, contactName: string) => {
    setSaving(contactId);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "nota",
          description: `Seguimiento pendiente - contactar a ${contactName}`,
          contactId,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Nota registrada");
      router.refresh();
    } catch {
      toast.error("Error al registrar nota");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="border-t-4 border-t-yellow-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
          <Clock className="h-4 w-4" />
          Seguimientos pendientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todos los clientes al dia</p>
        ) : (
          <div className="space-y-2">
            {contacts.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50">
                <Link href={`/contacts/${c.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Hace {c.daysSinceActivity} dias</p>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 cursor-pointer h-7 px-2"
                  disabled={saving === c.id}
                  onClick={() => handleQuickNote(c.id, c.name)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {saving === c.id ? "..." : "Nota"}
                </Button>
              </div>
            ))}
            {contacts.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                y {contacts.length - 5} mas
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OverduePaymentsCard({ payments }: { payments: OverduePaymentItem[] }) {
  return (
    <Card className="border-t-4 border-t-red-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-red-700">
          <DollarSign className="h-4 w-4" />
          Pagos pendientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin pagos pendientes</p>
        ) : (
          <div className="space-y-2">
            {payments.slice(0, 5).map((p) => (
              <Link key={p.dealId} href={`/deals/${p.dealId}`} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.contactName || p.dealTitle}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.dealTitle}</p>
                </div>
                <span className="text-sm font-semibold text-red-600 shrink-0">
                  {formatCurrency(p.pending)}
                </span>
              </Link>
            ))}
            {payments.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                y {payments.length - 5} mas
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
