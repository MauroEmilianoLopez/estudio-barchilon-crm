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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { WhatsAppModal, buildMessage, type TemplateKey } from "@/components/whatsapp/WhatsAppModal";
import { tryNotify } from "@/lib/whatsappNotify";

const activitySchema = z.object({
  type: z.enum(["audiencia", "escrito", "llamada", "reunion", "oficio", "notificacion", "nota"]),
  description: z.string().min(1, "La descripcion es requerida"),
  contactId: z.string().min(1, "El contacto es requerido"),
  dealId: z.string(),
  scheduledAt: z.string(),
});

type ActivityFormData = z.infer<typeof activitySchema>;
type ActivityType = ActivityFormData["type"];

const TEMPLATE_BY_ACTIVITY: Record<Exclude<ActivityType, "nota">, TemplateKey> = {
  audiencia: "act_audiencia",
  escrito: "act_escrito",
  llamada: "act_llamada",
  reunion: "act_reunion",
  oficio: "act_oficio",
  notificacion: "act_notificacion",
};

interface ContactListItem {
  id: string;
  name: string;
  phone: string | null;
}

interface ActivityFormProps {
  open: boolean;
  onClose: () => void;
  preselectedContactId?: string;
  preselectedDealId?: string;
  preselectedContactName?: string;
  preselectedContactPhone?: string | null;
  preselectedDealTitle?: string | null;
}

export function ActivityForm({
  open,
  onClose,
  preselectedContactId,
  preselectedDealId,
  preselectedContactName,
  preselectedContactPhone,
  preselectedDealTitle,
}: ActivityFormProps) {
  const router = useRouter();
  const [contactsList, setContacts] = useState<ContactListItem[]>([]);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [pendingNotification, setPendingNotification] = useState<{
    contactName: string;
    contactPhone: string;
    dealTitle: string | null;
    template: TemplateKey;
  } | null>(null);

  useEffect(() => {
    if (open && !preselectedContactId) {
      fetch("/api/contacts")
        .then((r) => r.json())
        .then(setContacts);
    }
  }, [open, preselectedContactId]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: "nota",
      description: "",
      contactId: preselectedContactId || "",
      dealId: preselectedDealId || "",
      scheduledAt: "",
    },
  });

  async function resolveContact(contactId: string): Promise<{ name: string; phone: string | null } | null> {
    if (preselectedContactId === contactId && preselectedContactName !== undefined) {
      return { name: preselectedContactName, phone: preselectedContactPhone ?? null };
    }
    const fromList = contactsList.find((c) => c.id === contactId);
    if (fromList) return { name: fromList.name, phone: fromList.phone };
    try {
      const res = await fetch(`/api/contacts/${contactId}`);
      if (!res.ok) return null;
      const c = await res.json();
      return { name: c.name, phone: c.phone ?? null };
    } catch {
      return null;
    }
  }

  const onSubmit = async (data: ActivityFormData) => {
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: data.type,
          description: data.description,
          contactId: data.contactId,
          dealId: data.dealId || null,
          scheduledAt: data.scheduledAt || null,
        }),
      });

      if (!res.ok) throw new Error("Error al crear actividad");

      toast.success("Actividad registrada");

      if (data.type !== "nota") {
        const template = TEMPLATE_BY_ACTIVITY[data.type as Exclude<ActivityType, "nota">];
        const contact = await resolveContact(data.contactId);
        if (contact?.phone) {
          const dealTitle = preselectedDealTitle ?? null;
          const message = buildMessage(template, {
            contactName: contact.name,
            deal: dealTitle ? { title: dealTitle, agreedFees: null, paidAmount: 0, nextHearing: null } : null,
          });
          const sent = await tryNotify({ phone: contact.phone, message, contactName: contact.name });
          if (!sent) {
            setPendingNotification({
              contactName: contact.name,
              contactPhone: contact.phone,
              dealTitle,
              template,
            });
            setWhatsappOpen(true);
            return;
          }
        }
      }

      reset();
      onClose();
      router.refresh();
    } catch {
      toast.error("Error al registrar la actividad");
    }
  };

  const handleWhatsappClose = () => {
    setWhatsappOpen(false);
    setPendingNotification(null);
    reset();
    onClose();
    router.refresh();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Actividad</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={watch("type")}
              onValueChange={(v) =>
                v && setValue("type", v as ActivityFormData["type"])
              }
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audiencia">Audiencia</SelectItem>
                <SelectItem value="escrito">Presentacion de escrito</SelectItem>
                <SelectItem value="llamada">Llamada al cliente</SelectItem>
                <SelectItem value="reunion">Reunion presencial</SelectItem>
                <SelectItem value="oficio">Oficio enviado</SelectItem>
                <SelectItem value="notificacion">Notificacion recibida</SelectItem>
                <SelectItem value="nota">Nota interna</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-desc">Descripcion *</Label>
            <Textarea
              id="activity-desc"
              {...register("description")}
              placeholder="Que sucedio o que necesitas hacer?"
              rows={3}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {!preselectedContactId && (
            <div className="space-y-2">
              <Label>Contacto *</Label>
              <Select
                value={watch("contactId")}
                onValueChange={(v) => v && setValue("contactId", v)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Seleccionar contacto" />
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
                <p className="text-xs text-destructive">
                  {errors.contactId.message}
                </p>
              )}
            </div>
          )}

          {watch("type") === "audiencia" && (
            <div className="space-y-2">
              <Label>Fecha programada</Label>
              <Input type="datetime-local" {...register("scheduledAt")} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {pendingNotification && (
      <WhatsAppModal
        open={whatsappOpen}
        onClose={handleWhatsappClose}
        contactName={pendingNotification.contactName}
        contactPhone={pendingNotification.contactPhone}
        deals={pendingNotification.dealTitle ? [{ title: pendingNotification.dealTitle, agreedFees: null, paidAmount: 0, nextHearing: null }] : []}
        defaultTemplate={pendingNotification.template}
      />
    )}
    </>
  );
}
