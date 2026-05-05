"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Send, CreditCard, Gavel, FileText, CheckCircle, PenLine, Briefcase, Trophy } from "lucide-react";
import { buildWhatsAppUrl, formatCurrency } from "@/lib/constants";

interface DealInfo {
  title: string;
  agreedFees: number | null;
  paidAmount: number;
  nextHearing: string | null;
}

export type TemplateKey =
  | "pago"
  | "audiencia"
  | "documentos"
  | "confirmacion"
  | "confirmacion_pago"
  | "tarea_realizada"
  | "resolucion_favorable"
  | "libre";

interface WhatsAppModalProps {
  open: boolean;
  onClose: () => void;
  contactName: string;
  contactPhone: string;
  deals?: DealInfo[];
  defaultTemplate?: TemplateKey;
  paymentAmount?: number; // in cents — for confirmacion_pago
  completedTaskTitle?: string; // for tarea_realizada
}

const TEMPLATES: Array<{ key: TemplateKey; label: string; icon: typeof CreditCard }> = [
  { key: "pago", label: "Recordatorio de pago", icon: CreditCard },
  { key: "audiencia", label: "Recordatorio de audiencia", icon: Gavel },
  { key: "documentos", label: "Solicitud de documentos", icon: FileText },
  { key: "confirmacion", label: "Confirmacion de pago", icon: CheckCircle },
  { key: "libre", label: "Mensaje personalizado", icon: PenLine },
];

interface BuildContext {
  contactName: string;
  deal: DealInfo | null;
  paymentAmount?: number;
  completedTaskTitle?: string;
}

function buildMessage(key: TemplateKey, ctx: BuildContext): string {
  const { contactName: name, deal, paymentAmount, completedTaskTitle } = ctx;
  const titulo = deal?.title || "[titulo del caso]";

  switch (key) {
    case "pago": {
      const saldo = deal && deal.agreedFees
        ? formatCurrency((deal.agreedFees || 0) - deal.paidAmount)
        : "$[monto]";
      return `Hola ${name}, te recuerdo que tenes un saldo pendiente de ${saldo} correspondiente al caso ${titulo}. Ante cualquier consulta estoy a tu disposicion. Saludos, Abril Barchilon.`;
    }
    case "audiencia": {
      const fecha = deal?.nextHearing || "[fecha]";
      return `Hola ${name}, te recuerdo que el ${fecha} tenemos una fecha de actuacion importante en tu caso ${titulo}. Por favor confirma tu disponibilidad. Saludos, Abril Barchilon.`;
    }
    case "documentos":
      return `Hola ${name}, para poder avanzar con tu caso ${titulo} necesito que me hagas llegar la siguiente documentacion: [completar documentacion requerida]. Quedamos en contacto. Saludos, Abril Barchilon.`;
    case "confirmacion":
      return `Hola ${name}, confirmamos la recepcion de tu pago. Muchas gracias. Ante cualquier consulta no dudes en contactarme. Saludos, Abril Barchilon.`;
    case "confirmacion_pago": {
      const monto = paymentAmount != null ? formatCurrency(paymentAmount) : "$[monto]";
      return `Hola ${name}, confirmamos la recepcion de tu pago de ${monto} correspondiente al caso ${titulo}. Muchas gracias. Ante cualquier consulta estoy a tu disposicion. Saludos, Abril Barchilon.`;
    }
    case "tarea_realizada": {
      const tarea = completedTaskTitle || "[tarea]";
      return `Hola ${name}, te informo que ya realice la tarea "${tarea}" correspondiente a tu caso ${titulo}. Quedamos en contacto. Saludos, Abril Barchilon.`;
    }
    case "resolucion_favorable":
      return `Hola ${name}, excelentes noticias: hemos obtenido una resolucion favorable en tu caso ${titulo}. Coordinemos una reunion para repasar los proximos pasos. Saludos, Abril Barchilon.`;
    case "libre":
      return `Hola ${name}, `;
  }
}

function formatHearingDate(d: DealInfo): string | null {
  if (!d.nextHearing) return null;
  try {
    const date = new Date(typeof d.nextHearing === "number" ? (d.nextHearing as number) * 1000 : d.nextHearing);
    return date.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d.nextHearing;
  }
}

const TITLE_BY_TEMPLATE: Partial<Record<TemplateKey, { icon: typeof CreditCard; label: string }>> = {
  confirmacion_pago: { icon: CheckCircle, label: "Confirmar pago al cliente" },
  tarea_realizada: { icon: Briefcase, label: "Avisar tarea realizada" },
  resolucion_favorable: { icon: Trophy, label: "Avisar resolucion favorable" },
  audiencia: { icon: Gavel, label: "Avisar fecha de actuacion" },
};

export function WhatsAppModal({
  open,
  onClose,
  contactName,
  contactPhone,
  deals,
  defaultTemplate,
  paymentAmount,
  completedTaskTitle,
}: WhatsAppModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
  const [selectedDealIdx, setSelectedDealIdx] = useState(0);
  const [message, setMessage] = useState("");

  const currentDeal = deals && deals.length > 0 ? deals[selectedDealIdx] : null;
  const dealWithFormattedDate = currentDeal
    ? { ...currentDeal, nextHearing: formatHearingDate(currentDeal) }
    : null;

  useEffect(() => {
    if (open && defaultTemplate) {
      setSelectedTemplate(defaultTemplate);
      setMessage(
        buildMessage(defaultTemplate, {
          contactName,
          deal: dealWithFormattedDate,
          paymentAmount,
          completedTaskTitle,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTemplate]);

  const handleSelectTemplate = (key: TemplateKey) => {
    setSelectedTemplate(key);
    setMessage(
      buildMessage(key, {
        contactName,
        deal: dealWithFormattedDate,
        paymentAmount,
        completedTaskTitle,
      })
    );
  };

  const handleSelectDeal = (idx: number) => {
    setSelectedDealIdx(idx);
    if (selectedTemplate) {
      const d = deals![idx];
      const dFormatted = { ...d, nextHearing: formatHearingDate(d) };
      setMessage(
        buildMessage(selectedTemplate, {
          contactName,
          deal: dFormatted,
          paymentAmount,
          completedTaskTitle,
        })
      );
    }
  };

  const handleSend = () => {
    const url = buildWhatsAppUrl(contactPhone, message);
    window.open(url, "_blank");
    onClose();
    setSelectedTemplate(null);
    setMessage("");
  };

  const handleClose = () => {
    onClose();
    setSelectedTemplate(null);
    setMessage("");
  };

  const titleConfig = selectedTemplate ? TITLE_BY_TEMPLATE[selectedTemplate] : undefined;
  const TitleIcon = titleConfig?.icon ?? MessageCircle;
  const titleLabel = titleConfig?.label ?? `Enviar WhatsApp a ${contactName}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TitleIcon className="h-5 w-5 text-green-600" />
            {titleLabel}
          </DialogTitle>
        </DialogHeader>

        {!selectedTemplate ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">Selecciona una plantilla:</p>
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => handleSelectTemplate(t.key)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left cursor-pointer"
              >
                <div className="rounded-full bg-green-100 p-2 shrink-0">
                  <t.icon className="h-4 w-4 text-green-700" />
                </div>
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {titleConfig && (
              <p className="text-xs text-muted-foreground">
                Para <span className="font-medium text-foreground">{contactName}</span>
                {currentDeal && <> · Caso <span className="font-medium text-foreground">{currentDeal.title}</span></>}
              </p>
            )}

            {deals && deals.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Caso asociado:</p>
                <div className="flex flex-wrap gap-2">
                  {deals.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectDeal(i)}
                      className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                        i === selectedDealIdx
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      {d.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Mensaje:</p>
                {!defaultTemplate && (
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    Cambiar plantilla
                  </button>
                )}
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Edita el mensaje antes de enviar. Los datos del caso se completaron automaticamente.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} className="cursor-pointer">
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={!message.trim()}
                className="bg-green-600 hover:bg-green-700 cursor-pointer"
              >
                <Send className="h-4 w-4 mr-2" />
                Abrir WhatsApp
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
