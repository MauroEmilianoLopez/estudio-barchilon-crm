import { db } from "@/db";
import { deals, contacts } from "@/db/schema";
import { eq, isNotNull, asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { formatDate } from "@/lib/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CASE_TYPE_LABELS: Record<string, string> = {
  civil: "Civil",
  laboral: "Laboral",
  penal: "Penal",
  familia: "Familia",
  comercial: "Comercial",
  otro: "Otro",
};

export default async function AgendaPage() {
  const upcoming = await db
    .select({
      dealId: deals.id,
      dealTitle: deals.title,
      nextHearing: deals.nextHearing,
      contactName: contacts.name,
      caseType: contacts.caseType,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .where(isNotNull(deals.nextHearing))
    .orderBy(asc(deals.nextHearing));

  const now = new Date();

  const items = upcoming.map((item) => {
    const hearingDate = item.nextHearing instanceof Date
      ? item.nextHearing
      : new Date(typeof item.nextHearing === "number" ? item.nextHearing * 1000 : item.nextHearing!);
    const diffMs = hearingDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { ...item, hearingDate, daysLeft };
  });

  const pastItems = items.filter((i) => i.daysLeft < 0);
  const urgentItems = items.filter((i) => i.daysLeft >= 0 && i.daysLeft <= 3);
  const upcomingItems = items.filter((i) => i.daysLeft > 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        <p className="text-muted-foreground">
          Proximas fechas de actuacion de todos los casos
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No hay fechas de actuacion cargadas. Carga una en la vista de un caso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pastItems.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-700 mb-2">Vencidas</h2>
              <div className="space-y-2">
                {pastItems.map((item) => (
                  <AgendaRow key={item.dealId} item={item} variant="past" />
                ))}
              </div>
            </div>
          )}

          {urgentItems.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-600 mb-2">Urgentes (3 dias o menos)</h2>
              <div className="space-y-2">
                {urgentItems.map((item) => (
                  <AgendaRow key={item.dealId} item={item} variant="urgent" />
                ))}
              </div>
            </div>
          )}

          {upcomingItems.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">Proximas</h2>
              <div className="space-y-2">
                {upcomingItems.map((item) => (
                  <AgendaRow key={item.dealId} item={item} variant="normal" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AgendaItem {
  dealId: string;
  dealTitle: string;
  contactName: string | null;
  caseType: string | null;
  hearingDate: Date;
  daysLeft: number;
}

function AgendaRow({ item, variant }: { item: AgendaItem; variant: "past" | "urgent" | "normal" }) {
  const borderColor = variant === "normal" ? "border-l-muted-foreground" : "border-l-red-500";

  return (
    <Link href={`/deals/${item.dealId}`}>
      <Card className={`border-l-4 ${borderColor} hover:shadow-md transition-shadow cursor-pointer`}>
        <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.dealTitle}</p>
            <p className="text-xs text-muted-foreground">
              {item.contactName || "Sin cliente"}
              {item.caseType && ` — ${CASE_TYPE_LABELS[item.caseType] || item.caseType}`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-muted-foreground">
              {formatDate(item.hearingDate)}
            </span>
            {variant === "past" ? (
              <Badge variant="destructive" className="text-xs">
                Vencida hace {Math.abs(item.daysLeft)} dia{Math.abs(item.daysLeft) !== 1 ? "s" : ""}
              </Badge>
            ) : variant === "urgent" ? (
              <Badge variant="destructive" className="text-xs">
                {item.daysLeft === 0 ? "Hoy" : item.daysLeft === 1 ? "Manana" : `En ${item.daysLeft} dias`}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                En {item.daysLeft} dias
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
