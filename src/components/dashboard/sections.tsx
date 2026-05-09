import { db } from "@/db";
import { contacts, deals, activities, payments, pipelineStages, tareas } from "@/db/schema";
import { eq, asc, desc, gte, sql, and, lte } from "drizzle-orm";
import { KPICards } from "@/components/dashboard/KPICards";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TodaySection, OtherPendingSection, ProspectoStaleSection } from "@/components/dashboard/TodaySection";
import { businessDaysBetween } from "@/lib/businessDays";
import type { DashboardStats } from "@/types";

export async function KPISectionAsync() {
  const allContacts = await db.select({ id: contacts.id, temperature: contacts.temperature }).from(contacts);
  const allDeals = await db.select({ id: deals.id, stageId: deals.stageId, value: deals.value }).from(deals);
  const stages = await db
    .select({ id: pipelineStages.id, isWon: pipelineStages.isWon, isLost: pipelineStages.isLost })
    .from(pipelineStages);

  const activeDeals = allDeals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stageId);
    return stage && !stage.isWon && !stage.isLost;
  });
  const wonDeals = allDeals.filter((d) => stages.find((s) => s.id === d.stageId)?.isWon);

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const [monthlyResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
    .from(payments)
    .where(gte(payments.date, firstOfMonth));

  const stats: DashboardStats = {
    totalContacts: allContacts.length,
    activeDeals: activeDeals.length,
    totalPipelineValue: activeDeals.reduce((sum, d) => sum + d.value, 0),
    wonDealsValue: wonDeals.reduce((sum, d) => sum + d.value, 0),
    conversionRate: allDeals.length > 0 ? Math.round((wonDeals.length / allDeals.length) * 100) : 0,
    hotLeads: allContacts.filter((c) => c.temperature === "hot").length,
    collectedThisMonth: Number(monthlyResult.total),
  };

  const isFirstRun = allContacts.length === 0 && allDeals.length === 0;

  return (
    <>
      {isFirstRun && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold mb-2">Bienvenido al CRM del Estudio Barchilon</h2>
          <p className="text-sm text-muted-foreground mb-4">Tu CRM esta listo. Aqui tienes como comenzar:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">1. Personaliza tu CRM</p>
              <p className="text-xs text-muted-foreground mt-1">Ejecuta <code className="bg-muted px-1 rounded">/setup</code></p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">2. Agrega contactos</p>
              <p className="text-xs text-muted-foreground mt-1">Ve a Contactos o usa <code className="bg-muted px-1 rounded">/add-lead</code></p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">3. Carga datos demo</p>
              <p className="text-xs text-muted-foreground mt-1">Ejecuta <code className="bg-muted px-1 rounded">npm run seed</code></p>
            </div>
          </div>
        </div>
      )}
      <KPICards stats={stats} />
    </>
  );
}

export async function PerentorioBannerAsync() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const dayAfterTomorrow = new Date(startOfDay.getTime() + 3 * 86400000);

  const alerts = await db
    .select({
      dealId: deals.id,
      dealTitle: deals.title,
      contactName: contacts.name,
      nextHearing: deals.nextHearing,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .where(
      and(
        eq(deals.esPerentorio, true),
        gte(deals.nextHearing, startOfDay),
        lte(deals.nextHearing, dayAfterTomorrow),
        eq(deals.hearingStatus, "pendiente")
      )
    );

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const hearingDate = alert.nextHearing instanceof Date
          ? alert.nextHearing
          : new Date(typeof alert.nextHearing === "number"
            ? (alert.nextHearing < 1e12 ? alert.nextHearing * 1000 : alert.nextHearing)
            : alert.nextHearing!);
        const daysUntil = Math.ceil((hearingDate.getTime() - now.getTime()) / 86400000);
        const daysLabel = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "1 DIA" : `${daysUntil} DIAS`;
        const isToday = hearingDate >= startOfDay && hearingDate < endOfDay;
        const finalLabel = isToday ? "HOY" : daysLabel;
        return (
          <a
            key={alert.dealId}
            href={`/deals/${alert.dealId}`}
            className="block rounded-xl border-2 border-red-600 bg-red-600 text-white p-4 md:p-6 shadow-lg animate-pulse"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl md:text-3xl font-black tracking-tight">
                PLAZO PERENTORIO VENCE EN {finalLabel}
              </span>
            </div>
            <div className="mt-2 text-lg md:text-xl font-semibold">
              {alert.dealTitle} — {alert.contactName || "Sin cliente"}
            </div>
            <p className="mt-1 text-sm text-red-100">El incumplimiento hace perder el derecho. Toca para ver el caso.</p>
          </a>
        );
      })}
    </div>
  );
}

export async function TodayAsync() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);

  const [vencimientosHoy, tareasHoy] = await Promise.all([
    db
      .select({
        dealId: deals.id,
        dealTitle: deals.title,
        contactName: contacts.name,
        esPerentorio: deals.esPerentorio,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .where(
        and(
          gte(deals.nextHearing, startOfDay),
          lte(deals.nextHearing, endOfDay),
          eq(deals.hearingStatus, "pendiente")
        )
      ),
    db
      .select({
        id: tareas.id,
        dealId: tareas.dealId,
        titulo: tareas.titulo,
        contactName: contacts.name,
      })
      .from(tareas)
      .leftJoin(contacts, eq(tareas.contactId, contacts.id))
      .where(
        and(
          gte(tareas.fecha, startOfDay),
          lte(tareas.fecha, endOfDay),
          eq(tareas.completada, false)
        )
      ),
  ]);

  return <TodaySection vencimientosHoy={vencimientosHoy} tareasHoy={tareasHoy} />;
}

export async function ProspectoStaleAsync() {
  const [prospectoStage] = await db
    .select({ id: pipelineStages.id })
    .from(pipelineStages)
    .where(eq(pipelineStages.name, "Prospecto"));

  if (!prospectoStage) return null;

  const prospectoDeals = await db
    .select({
      dealId: deals.id,
      dealTitle: deals.title,
      contactId: deals.contactId,
      contactName: contacts.name,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .where(eq(deals.stageId, prospectoStage.id));

  if (prospectoDeals.length === 0) return null;

  const contactIds = Array.from(new Set(prospectoDeals.map((d) => d.contactId)));
  const lastByContact = new Map<string, number>();
  if (contactIds.length > 0) {
    const acts = await db
      .select({ contactId: activities.contactId, createdAt: activities.createdAt })
      .from(activities)
      .orderBy(desc(activities.createdAt));
    for (const a of acts) {
      if (!contactIds.includes(a.contactId)) continue;
      if (lastByContact.has(a.contactId)) continue;
      const ts = typeof a.createdAt === "number"
        ? (a.createdAt < 1e12 ? a.createdAt * 1000 : a.createdAt)
        : a.createdAt instanceof Date
          ? a.createdAt.getTime()
          : 0;
      lastByContact.set(a.contactId, ts);
    }
  }

  const now = new Date();
  const items = prospectoDeals
    .map((d) => {
      const lastTs = lastByContact.get(d.contactId);
      const fallback = typeof d.createdAt === "number"
        ? (d.createdAt < 1e12 ? d.createdAt * 1000 : d.createdAt)
        : d.createdAt instanceof Date
          ? d.createdAt.getTime()
          : 0;
      const refTs = lastTs ?? fallback;
      const days = businessDaysBetween(new Date(refTs), now);
      return { dealId: d.dealId, dealTitle: d.dealTitle, contactName: d.contactName, days };
    })
    .filter((i) => i.days > 5)
    .sort((a, b) => b.days - a.days);

  if (items.length === 0) return null;

  return <ProspectoStaleSection items={items} />;
}

export async function OtherPendingAsync() {
  const now = new Date();

  const [allContacts, allDealsRaw, allActivitiesRaw] = await Promise.all([
    db.select({ id: contacts.id, name: contacts.name, createdAt: contacts.createdAt }).from(contacts),
    db.select({ id: deals.id, title: deals.title, contactId: deals.contactId, agreedFees: deals.agreedFees, paidAmount: deals.paidAmount }).from(deals),
    db.select({ contactId: activities.contactId, createdAt: activities.createdAt }).from(activities).orderBy(desc(activities.createdAt)),
  ]);

  const latestActivityByContact = new Map<string, number>();
  for (const a of allActivitiesRaw) {
    if (!latestActivityByContact.has(a.contactId)) {
      const ts = typeof a.createdAt === "number"
        ? a.createdAt * 1000
        : a.createdAt instanceof Date
          ? a.createdAt.getTime()
          : 0;
      latestActivityByContact.set(a.contactId, ts);
    }
  }

  const staleContacts = allContacts
    .map((c) => {
      const lastTs = latestActivityByContact.get(c.id);
      const ts = lastTs ?? (typeof c.createdAt === "number"
        ? c.createdAt * 1000
        : c.createdAt instanceof Date
          ? c.createdAt.getTime()
          : 0);
      const days = Math.floor((now.getTime() - ts) / 86400000);
      return days > 7 ? { id: c.id, name: c.name, daysSinceActivity: days } : null;
    })
    .filter(Boolean) as Array<{ id: string; name: string; daysSinceActivity: number }>;

  staleContacts.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

  const overduePayments = allDealsRaw
    .filter((d) => d.agreedFees != null && d.agreedFees > 0 && d.paidAmount < d.agreedFees)
    .map((d) => {
      const contact = allContacts.find((c) => c.id === d.contactId);
      return {
        dealId: d.id,
        dealTitle: d.title,
        contactName: contact?.name || null,
        pending: (d.agreedFees || 0) - d.paidAmount,
      };
    })
    .sort((a, b) => b.pending - a.pending);

  return <OtherPendingSection staleContacts={staleContacts} overduePayments={overduePayments} />;
}

export async function PipelineSectionAsync() {
  const [stages, allDeals] = await Promise.all([
    db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineType, "judicial"))
      .orderBy(asc(pipelineStages.order)),
    db
      .select({ stageId: deals.stageId, value: deals.value })
      .from(deals)
      .where(eq(deals.pipelineType, "judicial")),
  ]);

  const pipelineData = stages
    .filter((s) => !s.isLost)
    .map((stage) => ({
      name: stage.name,
      count: allDeals.filter((d) => d.stageId === stage.id).length,
      value: allDeals.filter((d) => d.stageId === stage.id).reduce((sum, d) => sum + d.value, 0),
      color: stage.color,
    }));

  return <PipelineChart data={pipelineData} />;
}

export async function RecentActivityAsync() {
  const recentActivities = await db
    .select({
      id: activities.id,
      type: activities.type,
      description: activities.description,
      contactName: contacts.name,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .orderBy(desc(activities.createdAt))
    .limit(5);

  return (
    <RecentActivity
      activities={
        recentActivities as Array<{
          id: string;
          type: string;
          description: string;
          contactName: string | null;
          createdAt: number | Date;
        }>
      }
    />
  );
}
