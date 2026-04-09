import { db } from "@/db";
import { deals, contacts, activities, pipelineStages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, DollarSign, FileText, Gavel, Scale, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/constants";
import { ACTIVITY_TYPE_CONFIG } from "@/lib/constants";

export const dynamic = "force-dynamic";

function PaymentStatus({ agreedFees, paidAmount }: { agreedFees: number | null; paidAmount: number }) {
  if (!agreedFees || agreedFees === 0) return null;

  if (paidAmount >= agreedFees) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <p className="text-lg font-bold text-green-600">Cancelado</p>
          <p className="text-xs text-muted-foreground">Honorarios abonados en su totalidad</p>
        </div>
      </div>
    );
  }

  if (paidAmount > 0) {
    const percent = Math.round((paidAmount / agreedFees) * 100);
    return (
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <div>
          <p className="text-lg font-bold text-yellow-600">Pago parcial</p>
          <p className="text-xs text-muted-foreground">{percent}% abonado — Resta {formatCurrency(agreedFees - paidAmount)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <XCircle className="h-5 w-5 text-red-600" />
      <div>
        <p className="text-lg font-bold text-red-600">Sin pago</p>
        <p className="text-xs text-muted-foreground">Pendiente: {formatCurrency(agreedFees)}</p>
      </div>
    </div>
  );
}

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
      <div className="flex items-center gap-4">
        <Link href="/deals">
          <Button variant="ghost" size="icon" className="cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{deal.title}</h1>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {deal.agreedFees != null && deal.agreedFees > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              Estado de pago
            </div>
            <PaymentStatus agreedFees={deal.agreedFees} paidAmount={deal.paidAmount} />
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  deal.paidAmount >= deal.agreedFees
                    ? "bg-green-500"
                    : deal.paidAmount > 0
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, Math.round((deal.paidAmount / deal.agreedFees) * 100))}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
