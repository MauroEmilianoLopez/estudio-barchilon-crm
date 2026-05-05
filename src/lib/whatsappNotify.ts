import { toast } from "sonner";

interface NotifyArgs {
  phone: string;
  message: string;
  contactName: string;
}

export async function tryNotify({ phone, message, contactName }: NotifyArgs): Promise<boolean> {
  try {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    if (res.ok && data?.ok === true) {
      toast.success(`WhatsApp enviado a ${contactName}`);
      return true;
    }
    toast.error(`No se pudo enviar el WhatsApp a ${contactName}, abriendo modal manual`);
    return false;
  } catch {
    toast.error(`No se pudo enviar el WhatsApp a ${contactName}, abriendo modal manual`);
    return false;
  }
}
