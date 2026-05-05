import { db } from "@/db";
import { deals, contacts, activities, pipelineStages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, DollarSign, FileText, Gavel, Scale, Hash, Landmark, AlertOctagon } from "lucide-react";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/constants";
import { ACTIVITY_TYPE_CONFIG, CASE_TYPE_LABELS } from "@/lib/constants";
import { PaymentsList } from "@/components/payments/PaymentsList";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { DealTareasSection } from "@/components/deals/DealTareasSection";
import { EditDealButton } from "@/components/deals/EditDealButton";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [deal] = await db.select().from(deals).where(eq(deals.id, id));
  if (!deal) notFound();

  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, deal.contactId));

  const [stage] = await db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.id, deal.stageId));

  const dealActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.dealId, id))
    .orderBy(desc(activities.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/deals">
          <Button variant="ghost" size="icon" className="cursor-pointer shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h1 className="text-lg md:text-2xl font-bold truncate">{deal.title}</h1>
            {stage && (
              <Badge
                variant="outline"
                style={{ borderColor: stage.color, color: stage.color }}
              >
                {stage.name}
              </Badge>
            )}
          </div>
          {contact && (
            <Link
              href={`/contacts/${contact.id}`}
              className="text-muted-foreground hover:text-primary text-sm"
            >
              {contact.name}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <EditDealButton dealId={id} />
          {contact?.phone && (
            <WhatsAppButton
              contactName={contact.name}
              contactPhone={contact.phone}
              deals={[{
                title: deal.title,
                agreedFees: deal.agreedFees,
                paidAmount: deal.paidAmount,
                nextHearing: deal.nextHearing ? String(deal.nextHearing) : null,
              }]}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Scale className="h-4 w-4" />
              Honorarios pactados
            </div>
            <p className="text-xl font-bold">
              {deal.agreedFees != null ? formatCurrency(deal.agreedFees) : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Cuotas pagas
            </div>
            <p className="text-xl font-bold">
              {formatCurrency(deal.paidAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Fecha estimada de cierre
            </div>
            <p className="text-xl font-bold">
              {formatDate(deal.expectedClose)}
            </p>
          </CardContent>
        </Card>
        {deal.nextHearing && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Gavel className="h-4 w-4" />
                Proxima fecha de actuacion
              </div>
              <p className="text-xl font-bold">
                {formatDate(deal.nextHearing)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Datos del expediente */}
      {(deal.caseNumber || deal.court || deal.caseType || deal.caseStartDate || deal.esPerentorio) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Expediente
              {deal.esPerentorio && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
                  <AlertOctagon className="h-3 w-3" />
                  PERENTORIO
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {deal.caseType && (
                <div className="flex items-center gap-2 text-sm">
                  <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{CASE_TYPE_LABELS[deal.caseType] || deal.caseType}</span>
                </div>
              )}
              {deal.caseNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Exp. {deal.caseNumber}</span>
                </div>
              )}
              {deal.court && (
                <div className="flex items-center gap-2 text-sm">
                  <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{deal.court}</span>
                </div>
              )}
              {deal.caseStartDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Inicio: {formatDate(deal.caseStartDate)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <DealTareasSection
        dealId={id}
        dealTitle={deal.title}
        contactName={contact?.name ?? ""}
        contactPhone={contact?.phone ?? null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentsList
          dealId={id}
          agreedFees={deal.agreedFees}
          dealTitle={deal.title}
          contactName={contact?.name ?? ""}
          contactPhone={contact?.phone ?? null}
        />
        {deal.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{deal.notes}</p>
            </CardContent>
          </Card>
        )}

        {deal.internalNotes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas internas del caso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{deal.internalNotes}</p>
            </CardContent>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Actividades ({dealActivities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dealActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay actividades registradas para este caso
              </p>
            ) : (
              <div className="space-y-3">
                {dealActivities.map((activity) => {
                  const config =
                    ACTIVITY_TYPE_CONFIG[
                      activity.type as keyof typeof ACTIVITY_TYPE_CONFIG
                    ];
                  return (
                    <div key={activity.id} className="flex gap-3 items-start">
                      <div className="rounded-full bg-muted p-2 shrink-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {config?.label || activity.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeDate(activity.createdAt as number | Date)}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{activity.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
