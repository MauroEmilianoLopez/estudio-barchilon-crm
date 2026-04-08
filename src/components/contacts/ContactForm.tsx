"use client";

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

const contactSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email invalido").or(z.literal("")),
  phone: z.string(),
  company: z.string(),
  source: z.string(),
  temperature: z.enum(["cold", "warm", "hot"]),
  notes: z.string(),
  caseType: z.string(),
  caseNumber: z.string(),
  court: z.string(),
  caseStartDate: z.string(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<ContactFormData> & { id?: string };
}

export function ContactForm({ open, onClose, initialData }: ContactFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      company: initialData?.company || "",
      source: initialData?.source || "otro",
      temperature: initialData?.temperature || "cold",
      notes: initialData?.notes || "",
      caseType: initialData?.caseType || "",
      caseNumber: initialData?.caseNumber || "",
      court: initialData?.court || "",
      caseStartDate: initialData?.caseStartDate || "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      const url = isEditing
        ? `/api/contacts/${initialData!.id}`
        : "/api/contacts";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast.success(
        isEditing ? "Contacto actualizado" : "Contacto creado"
      );
      reset();
      onClose();
      router.refresh();
    } catch {
      toast.error("Error al guardar el contacto");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Contacto" : "Nuevo Contacto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" {...register("name")} placeholder="Nombre completo" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="correo@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input id="phone" {...register("phone")} placeholder="+52 55 1234 5678" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Empresa</Label>
            <Input id="company" {...register("company")} placeholder="Nombre de la empresa" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fuente</Label>
              <Select
                value={watch("source")}
                onValueChange={(v) => v && setValue("source", v)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Sitio web</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="referido">Referido</SelectItem>
                  <SelectItem value="redes_sociales">Redes sociales</SelectItem>
                  <SelectItem value="llamada_fria">Llamada fria</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="formulario">Formulario</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="import">Importado</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={watch("temperature")}
                onValueChange={(v) =>
                  v && setValue("temperature", v as "cold" | "warm" | "hot")
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">Inactivo</SelectItem>
                  <SelectItem value="warm">En curso</SelectItem>
                  <SelectItem value="hot">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Datos del caso</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de caso</Label>
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Notas sobre el contacto..." rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
