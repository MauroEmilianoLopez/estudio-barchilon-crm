"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Send, CreditCard, Gavel, FileText, CheckCircle, PenLine } from "lucide-react";
import { cleanPhoneForWhatsApp, formatCurrency } from "@/lib/constants";

interface DealInfo {
  title: string;
  agreedFees: number | null;
  paidAmount: number;
  nextHearing: string | null;
}

interface WhatsAppModalProps {
  open: boolean;
  onClose: () => void;
  contactName: string;
  contactPhone: string;
  deals?: DealInfo[];
}

type TemplateKey = "pago" | "audiencia" | "documentos" | "confirmacion" | "libre";

const TEMPLATES: Array<{ key: TemplateKey; label: string; icon: typeof CreditCard }> = [
  { key: "pago", label: "Recordatorio de pago", icon: CreditCard },
  { key: "audiencia", label: "Recordatorio de audiencia", icon: Gavel },
  { key: "documentos", label: "Solicitud de documentos", icon: FileText },
  { key: "confirmacion", label: "Confirmacion de pago", icon: CheckCircle },
  { key: "libre", label: "Mensaje personalizado", icon: PenLine },
];

function buildMessage(
  key: TemplateKey,
  name: string,
  deal: DealInfo | null
): string {
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

export function WhatsAppModal({ open, onClose, contactName, contactPhone, deals }: WhatsAppModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
  const [selectedDealIdx, setSelectedDealIdx] = useState(0);
  const [message, setMessage] = useState("");

  const currentDeal = deals && deals.length > 0 ? deals[selectedDealIdx] : null;
  const dealWithFormattedDate = currentDeal
    ? { ...currentDeal, nextHearing: formatHearingDate(currentDeal) }
    : null;

  const handleSelectTemplate = (key: TemplateKey) => {
    setSelectedTemplate(key);
    setMessage(buildMessage(key, contactName, dealWithFormattedDate));
  };

  const handleSelectDeal = (idx: number) => {
    setSelectedDealIdx(idx);
    if (selectedTemplate) {
      const d = deals![idx];
      const dFormatted = { ...d, nextHearing: formatHearingDate(d) };
      setMessage(buildMessage(selectedTemplate, contactName, dFormatted));
    }
  };

  const handleSend = () => {
    const phone = cleanPhoneForWhatsApp(contactPhone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar WhatsApp a {contactName}
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
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Cambiar plantilla
                </button>
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
