"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const dealSchema = z.object({
  title: z.string().min(1, "El titulo es requerido"),
  contactId: z.string().min(1, "El cliente es requerido"),
  stageId: z.string(),
  expectedClose: z.string(),
  notes: z.string(),
  agreedFees: z.string(),
  paidAmount: z.string(),
  nextHearing: z.string(),
  esPerentorio: z.boolean(),
  caseType: z.string(),
  caseNumber: z.string(),
  court: z.string(),
  caseStartDate: z.string(),
  internalNotes: z.string(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  open: boolean;
  onClose: () => void;
}

export function DealForm({ open, onClose }: DealFormProps) {
  const router = useRouter();
  const [contactsList, setContacts] = useState<Array<{ id: string; name: string }>>([]);
  const [stagesList, setStages] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (open) {
      fetch("/api/contacts").then((r) => r.json()).then(setContacts);
      fetch("/api/pipeline").then((r) => r.json()).then(setStages);
    }
  }, [open]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: "",
      contactId: "",
      stageId: "",
      expectedClose: "",
      notes: "",
      agreedFees: "",
      paidAmount: "",
      nextHearing: "",
      esPerentorio: false,
      caseType: "",
      caseNumber: "",
      court: "",
      caseStartDate: "",
      internalNotes: "",
    },
  });

  const onSubmit = async (data: DealFormData) => {
    try {
      const agreedFees = data.agreedFees ? parseFloat(data.agreedFees) : null;
      const paidAmount = data.paidAmount ? parseFloat(data.paidAmount) : 0;

      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          value: agreedFees != null ? Math.round(agreedFees * 100) : 0,
          probability: 0,
          agreedFees,
          paidAmount,
          nextHearing: data.nextHearing || null,
          esPerentorio: data.esPerentorio,
          caseType: data.caseType || null,
          caseNumber: data.caseNumber || null,
          court: data.court || null,
          caseStartDate: data.caseStartDate || null,
          internalNotes: data.internalNotes || null,
        }),
      });

      if (!res.ok) throw new Error("Error al crear caso");

      toast.success("Caso creado exitosamente");
      reset();
      onClose();
      router.refresh();
    } catch {
      toast.error("Error al crear el caso");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Caso</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deal-title">Titulo del caso *</Label>
            <Input id="deal-title" {...register("title")} placeholder="Ej: Sucesion Garcia Lopez" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              value={watch("contactId")}
              onValueChange={(v) => v && setValue("contactId", v)}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {contactsList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.contactId && (
              <p className="text-xs text-destructive">{errors.contactId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select
                value={watch("stageId")}
                onValueChange={(v) => v && setValue("stageId", v)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Primera etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stagesList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha estimada de cierre</Label>
              <Input type="date" {...register("expectedClose")} />
            </div>
          </div>

          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Honorarios y pagos</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="agreedFees">Honorarios pactados (ARS)</Label>
                <Input
                  id="agreedFees"
                  type="number"
                  step="0.01"
                  {...register("agreedFees")}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Cuotas pagas (ARS)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  step="0.01"
                  {...register("paidAmount")}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Datos del expediente</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de causa</Label>
                <Select
                  value={watch("caseType")}
                  onValueChange={(v) => v && setValue("caseType", v)}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="civil">Civil</SelectItem>
                    <SelectItem value="laboral">Laboral</SelectItem>
                    <SelectItem value="familia">Familia</SelectItem>
                    <SelectItem value="penal">Penal</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="caseNumber">N° de expediente</Label>
                <Input id="caseNumber" {...register("caseNumber")} placeholder="Ej: 12345/2026" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-2">
                <Label htmlFor="court">Tribunal / Juzgado</Label>
                <Input id="court" {...register("court")} placeholder="Ej: Juzgado Civil N°5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caseStartDate">Inicio del caso</Label>
                <Input id="caseStartDate" type="date" {...register("caseStartDate")} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Fechas y plazos</p>
            <div className="space-y-2">
              <Label htmlFor="nextHearing">Proxima fecha de actuacion</Label>
              <Input id="nextHearing" type="date" {...register("nextHearing")} />
              <p className="text-xs text-muted-foreground">Recordatorio: En Argentina el plazo vence a las 9:00 del dia posterior</p>
            </div>
            <div className="flex items-start gap-3 mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50">
              <Checkbox
                id="esPerentorio"
                checked={watch("esPerentorio")}
                onCheckedChange={(checked) => setValue("esPerentorio", checked === true)}
                className="mt-0.5 cursor-pointer"
              />
              <div>
                <Label htmlFor="esPerentorio" className="text-sm font-semibold text-amber-900 cursor-pointer">
                  Plazo perentorio
                </Label>
                <p className="text-xs text-amber-700 mt-0.5">
                  El incumplimiento hace perder el derecho. Se mostrara una alerta critica cuando el plazo este por vencer.
                </p>
              </div>
            </div>
            <div className="space-y-2 mt-3">
              <Label htmlFor="deal-notes">Notas</Label>
              <Textarea id="deal-notes" {...register("notes")} rows={2} />
            </div>
            <div className="space-y-2 mt-3">
              <Label htmlFor="internalNotes">Notas internas del caso</Label>
              <Textarea id="internalNotes" {...register("internalNotes")} rows={2} placeholder="Notas confidenciales del caso..." />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? "Creando..." : "Crear Caso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
