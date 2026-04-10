"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/constants";
import { PaymentForm } from "./PaymentForm";

const METHOD_LABELS: Record<string, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  cheque: "Cheque",
  deposito: "Deposito",
};

interface Payment {
  id: string;
  date: number | Date;
  amount: number;
  currency: string;
  paymentMethod: string;
  receipt: string | null;
}

interface PaymentsListProps {
  dealId: string;
  agreedFees: number | null;
}

export function PaymentsList({ dealId, agreedFees }: PaymentsListProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(() => {
    fetch(`/api/payments?dealId=${dealId}`)
      .then((r) => r.json())
      .then((data) => {
        setPayments(data);
        setLoading(false);
      });
  }, [dealId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleClose = () => {
    setShowForm(false);
    fetchPayments();
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const fees = agreedFees || 0;
  const percent = fees > 0 ? Math.min(100, Math.round((totalPaid / fees) * 100)) : 0;
  const remaining = fees - totalPaid;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Pagos ({payments.length})</CardTitle>
        <Button size="sm" onClick={() => setShowForm(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-1" />
          Registrar Pago
        </Button>
      </CardHeader>
      <CardContent>
        {fees > 0 && (
          <div className="mb-4 p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Honorarios pactados</p>
                <p className="text-sm font-bold">{formatCurrency(fees)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total cobrado</p>
                <p className="text-sm font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                <p className={`text-sm font-bold ${remaining <= 0 ? "text-green-600" : "text-red-600"}`}>
                  {remaining <= 0 ? "Cancelado" : formatCurrency(remaining)}
                </p>
              </div>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  totalPaid >= fees ? "bg-green-500" : totalPaid > 0 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">{percent}% cobrado</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay pagos registrados para este caso
          </p>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="md:hidden space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">{formatCurrency(p.amount)}</span>
                    <Badge variant="outline" className="text-xs">{p.currency}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-sm text-muted-foreground">
                    <span>{formatDate(p.date)}</span>
                    <span>{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</span>
                  </div>
                  {p.receipt && (
                    <p className="text-xs text-muted-foreground mt-1">Comp: {p.receipt}</p>
                  )}
                </div>
              ))}
            </div>
            {/* Desktop: Table */}
            <div className="hidden md:block rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead>Metodo</TableHead>
                    <TableHead>Comprobante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{formatDate(p.date)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
                      <TableCell><Badge variant="outline">{p.currency}</Badge></TableCell>
                      <TableCell className="text-sm">{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.receipt || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      <PaymentForm open={showForm} onClose={handleClose} dealId={dealId} />
    </Card>
  );
}
