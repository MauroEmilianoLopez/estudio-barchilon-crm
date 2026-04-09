"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const paymentSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  amount: z.string().min(1, "El monto es requerido"),
  currency: z.enum(["ARS", "USD"]),
  paymentMethod: z.string().min(1, "El metodo de pago es requerido"),
  receipt: z.string(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  open: boolean;
  onClose: () => void;
  dealId: string;
}

export function PaymentForm({ open, onClose, dealId }: PaymentFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      amount: "",
      currency: "ARS",
      paymentMethod: "transferencia",
      receipt: "",
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const amountCents = Math.round(parseFloat(data.amount) * 100);

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          date: data.date,
          amount: amountCents,
          currency: data.currency,
          paymentMethod: data.paymentMethod,
          receipt: data.receipt || null,
        }),
      });

      if (!res.ok) throw new Error("Error al registrar pago");

      toast.success("Pago registrado");
      reset();
      onClose();
      router.refresh();
    } catch {
      toast.error("Error al registrar el pago");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="payment-date">Fecha *</Label>
              <Input id="payment-date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Monto *</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                {...register("amount")}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={watch("currency")}
                onValueChange={(v) => v && setValue("currency", v as "ARS" | "USD")}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Metodo de pago *</Label>
              <Select
                value={watch("paymentMethod")}
                onValueChange={(v) => v && setValue("paymentMethod", v)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="deposito">Deposito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-receipt">Comprobante (opcional)</Label>
            <Input
              id="payment-receipt"
              {...register("receipt")}
              placeholder="Numero de comprobante o referencia"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? "Guardando..." : "Registrar Pago"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
