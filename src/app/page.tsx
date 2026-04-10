import { db } from "@/db";
import { contacts, deals, activities, payments, pipelineStages } from "@/db/schema";
import { eq, asc, desc, gte, sql, isNotNull, and, lte } from "drizzle-orm";
import { KPICards } from "@/components/dashboard/KPICards";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { NotificationBanner } from "@/components/dashboard/NotificationBanner";
import { TodaySection } from "@/components/dashboard/TodaySection";
import type { DashboardStats } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const allContacts = await db.select().from(contacts);
  const allDeals = await db.select().from(deals);
  const stages = await db
    .select()
    .from(pipelineStages)
    .orderBy(asc(pipelineStages.order));

  const activeDeals = allDeals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stageId);
    return stage && !stage.isWon && !stage.isLost;
  });

  const wonDeals = allDeals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stageId);
    return stage?.isWon;
  });

  // Honorarios cobrados este mes
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [monthlyResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
    .from(payments)
    .where(gte(payments.date, firstOfMonth));

  const stats: DashboardStats = {
    totalContacts: allContacts.length,
    activeDeals: activeDeals.length,
    totalPipelineValue: activeDeals.reduce((sum, d) => sum + d.value, 0),
    wonDealsValue: wonDeals.reduce((sum, d) => sum + d.value, 0),
    conversionRate:
      allDeals.length > 0
        ? Math.round((wonDeals.length / allDeals.length) * 100)
        : 0,
    hotLeads: allContacts.filter((c) => c.temperature === "hot").length,
    collectedThisMonth: Number(monthlyResult.total),
  };

  // --- SECCION HOY ---

  // 1. Audiencias de hoy: deals con nextHearing = hoy
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);

  const todayHearings = await db
    .select({
      dealId: deals.id,
      dealTitle: deals.title,
      contactName: contacts.name,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .where(
      and(
        gte(deals.nextHearing, startOfDay),
        lte(deals.nextHearing, endOfDay)
      )
    );

  // 2. Seguimientos pendientes: contactos con >7 dias sin actividad
  const allActivities = await db
    .select({
      contactId: activities.contactId,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .orderBy(desc(activities.createdAt));

  const latestActivityByContact = new Map<string, number>();
  for (const a of allActivities) {
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
      if (!lastTs) {
        const createdTs = typeof c.createdAt === "number"
          ? c.createdAt * 1000
          : c.createdAt instanceof Date
            ? c.createdAt.getTime()
            : 0;
        const days = Math.floor((now.getTime() - createdTs) / 86400000);
        return days > 7 ? { id: c.id, name: c.name, daysSinceActivity: days } : null;
      }
      const days = Math.floor((now.getTime() - lastTs) / 86400000);
      return days > 7 ? { id: c.id, name: c.name, daysSinceActivity: days } : null;
    })
    .filter(Boolean) as Array<{ id: string; name: string; daysSinceActivity: number }>;

  staleContacts.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

  // 3. Pagos pendientes: casos con honorarios > 0 y saldo pendiente > 0
  const overduePayments = allDeals
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

  // --- FIN SECCION HOY ---

  const pipelineData = stages
    .filter((s) => !s.isLost)
    .map((stage) => ({
      name: stage.name,
      count: allDeals.filter((d) => d.stageId === stage.id).length,
      value: allDeals
        .filter((d) => d.stageId === stage.id)
        .reduce((sum, d) => sum + d.value, 0),
      color: stage.color,
    }));

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

  const isFirstRun = allContacts.length === 0 && allDeals.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen del estudio
        </p>
      </div>

      {isFirstRun && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold mb-2">
            Bienvenido al CRM del Estudio Barchilon
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Tu CRM esta listo. Aqui tienes como comenzar:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">1. Personaliza tu CRM</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ejecuta <code className="bg-muted px-1 rounded">/setup</code> en Claude Code
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">2. Agrega contactos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ve a Contactos o usa <code className="bg-muted px-1 rounded">/add-lead</code>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">3. Carga datos demo</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ejecuta <code className="bg-muted px-1 rounded">npm run seed</code> en terminal
              </p>
            </div>
          </div>
        </div>
      )}

      <TodaySection
        hearings={todayHearings}
        staleContacts={staleContacts}
        overduePayments={overduePayments}
      />

      <NotificationBanner />

      <KPICards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PipelineChart data={pipelineData} />
        </div>
        <div>
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
        </div>
      </div>
    </div>
  );
}
