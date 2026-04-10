"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus, Briefcase, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/constants";
import { DealForm } from "@/components/deals/DealForm";

interface DealRow {
  id: string;
  title: string;
  contactName: string | null;
  stageName: string | null;
  stageColor: string | null;
  agreedFees: number | null;
  paidAmount: number;
  expectedClose: number | Date | null;
}

function PaymentBadge({ agreedFees, paidAmount }: { agreedFees: number | null; paidAmount: number }) {
  if (!agreedFees || agreedFees === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }
  if (paidAmount >= agreedFees) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Cancelado
      </span>
    );
  }
  if (paidAmount > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        Pago parcial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Sin pago
    </span>
  );
}

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/deals")
      .then((res) => res.json())
      .then((data) => {
        setDeals(data);
        setLoading(false);
      });
  }, [showForm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Casos</h1>
          <p className="text-muted-foreground text-sm hidden sm:block">
            Casos juridicos en gestion
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/export?type=deals")}
            className="cursor-pointer hidden sm:inline-flex"
          >
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Nuevo Caso</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No hay casos"
          description="Crea tu primer caso para comenzar a gestionar el estudio."
          actionLabel="Crear caso"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <>
        {/* Mobile: Cards */}
        <div className="md:hidden space-y-3">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="p-4 rounded-xl border bg-card cursor-pointer active:bg-muted/50 transition-colors"
              onClick={() => router.push(`/deals/${deal.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base truncate">{deal.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{deal.contactName || "Sin cliente"}</p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 text-xs"
                  style={{ borderColor: deal.stageColor || undefined, color: deal.stageColor || undefined }}
                >
                  {deal.stageName}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-base font-semibold text-primary">
                  {deal.agreedFees ? formatCurrency(deal.agreedFees) : "-"}
                </span>
                <PaymentBadge agreedFees={deal.agreedFees} paidAmount={deal.paidAmount ?? 0} />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Honorarios pactados</TableHead>
                <TableHead>Estado de pago</TableHead>
                <TableHead className="hidden lg:table-cell">Cierre est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow
                  key={deal.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/deals/${deal.id}`)}
                >
                  <TableCell className="font-medium">{deal.title}</TableCell>
                  <TableCell>{deal.contactName || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: deal.stageColor || undefined,
                        color: deal.stageColor || undefined,
                      }}
                    >
                      {deal.stageName}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {deal.agreedFees ? formatCurrency(deal.agreedFees) : "-"}
                  </TableCell>
                  <TableCell>
                    <PaymentBadge agreedFees={deal.agreedFees} paidAmount={deal.paidAmount ?? 0} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(deal.expectedClose)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      <DealForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
