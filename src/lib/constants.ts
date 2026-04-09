import type { Temperature, LeadSource, ActivityType } from "@/types";

export const TEMPERATURE_CONFIG: Record<
  Temperature,
  { label: string; color: string; bgColor: string }
> = {
  cold: { label: "Inactivo", color: "#64748b", bgColor: "#f1f5f9" },
  warm: { label: "En curso", color: "#ea580c", bgColor: "#fff7ed" },
  hot: { label: "Urgente", color: "#dc2626", bgColor: "#fef2f2" },
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  referido: "Referido",
  consulta_espontanea: "Consulta espontanea",
  cliente_recurrente: "Cliente recurrente",
  redes_sociales: "Redes sociales",
  otro: "Otro",
};

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: string }
> = {
  audiencia: { label: "Audiencia", icon: "Gavel" },
  escrito: { label: "Presentacion de escrito", icon: "FileText" },
  llamada: { label: "Llamada al cliente", icon: "Phone" },
  reunion: { label: "Reunion presencial", icon: "Users" },
  oficio: { label: "Oficio enviado", icon: "Send" },
  notificacion: { label: "Notificacion recibida", icon: "Bell" },
  nota: { label: "Nota interna", icon: "StickyNote" },
};

export const CASE_TYPE_LABELS: Record<string, string> = {
  civil: "Civil",
  laboral: "Laboral",
  penal: "Penal",
  familia: "Familia",
  comercial: "Comercial",
  otro: "Otro",
};

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(cents / 100);
}

export function cleanPhoneForWhatsApp(phone: string): string {
  // "+52 55 1234 5678" → "525512345678"
  return phone.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
}

function toDate(date: Date | number): Date {
  if (date instanceof Date) return date;
  // If number is less than 1e12, it's in seconds; otherwise milliseconds
  return new Date(date < 1e12 ? date * 1000 : date);
}

export function formatDate(date: Date | number | null): string {
  if (!date) return "-";
  const d = toDate(date);
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatRelativeDate(date: Date | number): string {
  const d = toDate(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} dias`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return formatDate(date);
}
