"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gavel, Clock, DollarSign, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";
import Link from "next/link";

interface HearingItem {
  dealId: string;
  dealTitle: string;
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

interface TodaySectionProps {
  hearings: HearingItem[];
  staleContacts: StaleContactItem[];
  overduePayments: OverduePaymentItem[];
}

export function TodaySection({ hearings, staleContacts, overduePayments }: TodaySectionProps) {
  const isEmpty = hearings.length === 0 && staleContacts.length === 0 && overduePayments.length === 0;
  if (isEmpty) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <HearingsCard hearings={hearings} />
      <StaleContactsCard contacts={staleContacts} />
      <OverduePaymentsCard payments={overduePayments} />
    </div>
  );
}

function HearingsCard({ hearings }: { hearings: HearingItem[] }) {
  return (
    <Card className="border-t-4 border-t-blue-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
          <Gavel className="h-4 w-4" />
          Audiencias de hoy
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hearings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin audiencias hoy</p>
        ) : (
          <div className="space-y-2">
            {hearings.map((h) => (
              <Link key={h.dealId} href={`/deals/${h.dealId}`} className="block p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <p className="text-sm font-medium">{h.dealTitle}</p>
                <p className="text-xs text-muted-foreground">{h.contactName || "Sin cliente"}</p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
