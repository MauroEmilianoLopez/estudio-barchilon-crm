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
import { WhatsAppModal, buildMessage, formatHearingDate } from "@/components/whatsapp/WhatsAppModal";
import { tryNotify } from "@/lib/whatsappNotify";

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
  pipelineType: z.enum(["judicial", "administrativo"]),
  organismo: z.string(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  open: boolean;
  onClose: () => void;
  dealId?: string;
}

interface ContactOption {
  id: string;
  name: string;
  phone: string | null;
}

function toDateInput(v: string | number | Date | null | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function centsToDecimalString(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toString();
}

export function DealForm({ open, onClose, dealId }: DealFormProps) {
  const router = useRouter();
  const isEdit = !!dealId;
  const [contactsList, setContacts] = useState<ContactOption[]>([]);
  const [stagesList, setStages] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [previousHearing, setPreviousHearing] = useState<string>("");
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [pendingNotification, setPendingNotification] = useState<{
    contactName: string;
    contactPhone: string;
    dealTitle: string;
    nextHearing: string;
  } | null>(null);

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
      pipelineType: "judicial",
      organismo: "",
    },
  });

  const currentPipelineType = watch("pipelineType");

  useEffect(() => {
    if (!open) return;

    fetch("/api/contacts").then((r) => r.json()).then(setContacts);

    if (isEdit && dealId) {
      setLoading(true);
      fetch(`/api/deals/${dealId}`)
        .then((r) => r.json())
        .then((deal) => {
          const hearing = toDateInput(deal.nextHearing);
          reset({
            title: deal.title || "",
            contactId: deal.contactId || "",
            stageId: deal.stageId || "",
            expectedClose: toDateInput(deal.expectedClose),
            notes: deal.notes || "",
            agreedFees: centsToDecimalString(deal.agreedFees),
            paidAmount: centsToDecimalString(deal.paidAmount),
            nextHearing: hearing,
            esPerentorio: deal.esPerentorio === true,
            caseType: deal.caseType || "",
            caseNumber: deal.caseNumber || "",
            court: deal.court || "",
            caseStartDate: toDateInput(deal.caseStartDate),
            internalNotes: deal.internalNotes || "",
            pipelineType: deal.pipelineType === "administrativo" ? "administrativo" : "judicial",
            organismo: deal.organismo || "",
          });
          setPreviousHearing(hearing);
        })
        .finally(() => setLoading(false));
    } else {
      reset();
      setPreviousHearing("");
    }
  }, [open, isEdit, dealId, reset]);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/pipeline?type=${currentPipelineType}`)
      .then((r) => r.json())
      .then(setStages);
  }, [open, currentPipelineType]);

  const onSubmit = async (data: DealFormData) => {
    try {
      const agreedFees = data.agreedFees ? parseFloat(data.agreedFees) : null;
      const paidAmount = data.paidAmount ? parseFloat(data.paidAmount) : 0;

      const url = isEdit ? `/api/deals/${dealId}` : "/api/deals";
      const method = isEdit ? "PUT" : "POST";

      const isAdmin = data.pipelineType === "administrativo";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          value: agreedFees != null ? Math.round(agreedFees * 100) : 0,
          probability: 0,
          agreedFees,
          paidAmount,
          nextHearing: data.nextHearing || null,
          esPerentorio: data.esPerentorio,
          caseType: isAdmin ? null : (data.caseType || null),
          caseNumber: isAdmin ? null : (data.caseNumber || null),
          court: isAdmin ? null : (data.court || null),
          caseStartDate: isAdmin ? null : (data.caseStartDate || null),
          internalNotes: data.internalNotes || null,
          pipelineType: data.pipelineType,
          organismo: isAdmin ? (data.organismo || null) : null,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || (isEdit ? "Error al actualizar caso" : "Error al crear caso"));
      }

      toast.success(isEdit ? "Caso actualizado" : "Caso creado exitosamente");

      const hearingChanged = data.nextHearing && data.nextHearing !== previousHearing;
      const contact = contactsList.find((c) => c.id === data.contactId);

      if (hearingChanged && contact?.phone) {
        const contactPhone = contact.phone;
        const contactName = contact.name;
        const dealForMsg = { title: data.title, agreedFees: null, paidAmount: 0, nextHearing: data.nextHearing };
        const message = buildMessage("audiencia", {
          contactName,
          deal: { ...dealForMsg, nextHearing: formatHearingDate(dealForMsg) },
        });
        const sent = await tryNotify({ phone: contactPhone, message, contactName });
        if (!sent) {
          setPendingNotification({
            contactName,
            contactPhone,
            dealTitle: data.title,
            nextHearing: data.nextHearing,
          });
          setWhatsappOpen(true);
        }
      }

      reset();
      onClose();
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : (isEdit ? "Error al actualizar el caso" : "Error al crear el caso");
      toast.error(msg);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Caso" : "Nuevo Caso"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-6">
            <div className="h-9 bg-muted rounded animate-pulse" />
            <div className="h-9 bg-muted rounded animate-pulse" />
            <div className="h-9 bg-muted rounded animate-pulse" />
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de caso *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (currentPipelineType !== "judicial") {
                    setValue("pipelineType", "judicial");
                    setValue("stageId", "");
                  }
                }}
                className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors cursor-pointer ${
                  currentPipelineType === "judicial"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-input bg-background hover:bg-muted/50"
                }`}
              >
                Judicial
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentPipelineType !== "administrativo") {
                    setValue("pipelineType", "administrativo");
                    setValue("stageId", "");
                  }
                }}
                className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors cursor-pointer ${
                  currentPipelineType === "administrativo"
                    ? "bg-amber-50"
                    : "border-input bg-background hover:bg-muted/50"
                }`}
                style={
                  currentPipelineType === "administrativo"
                    ? { borderColor: "#f59e0b", color: "#b45309" }
                    : undefined
                }
              >
                Administrativo
              </button>
            </div>
          </div>

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

          {currentPipelineType === "judicial" ? (
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
          ) : (
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Datos del trámite</p>
              <div className="space-y-2">
                <Label htmlFor="organismo">Organismo</Label>
                <Input id="organismo" {...register("organismo")} placeholder="Ej: ANSES, DPIP, Defensa del Consumidor, RPI" />
              </div>
            </div>
          )}

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
              {isSubmitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear Caso"}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
    {pendingNotification && (
      <WhatsAppModal
        open={whatsappOpen}
        onClose={() => {
          setWhatsappOpen(false);
          setPendingNotification(null);
        }}
        contactName={pendingNotification.contactName}
        contactPhone={pendingNotification.contactPhone}
        deals={[{
          title: pendingNotification.dealTitle,
          agreedFees: null,
          paidAmount: 0,
          nextHearing: pendingNotification.nextHearing,
        }]}
        defaultTemplate="audiencia"
      />
    )}
    </>
  );
}
