import { Suspense } from "react";
import { NotificationBanner } from "@/components/dashboard/NotificationBanner";
import {
  KPISectionAsync,
  PerentorioBannerAsync,
  TodayAsync,
  OtherPendingAsync,
  PipelineSectionAsync,
  RecentActivityAsync,
} from "@/components/dashboard/sections";

export const dynamic = "force-dynamic";

function Skeleton({ height = 120, label }: { height?: number; label?: string }) {
  return (
    <div
      className="rounded-xl bg-muted animate-pulse flex items-center justify-center"
      style={{ minHeight: height }}
    >
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div>
      <div className="h-6 w-24 bg-muted rounded animate-pulse mb-3" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen del estudio</p>
      </div>

      <Suspense fallback={null}>
        <PerentorioBannerAsync />
      </Suspense>

      <Suspense fallback={<KPISkeleton />}>
        <KPISectionAsync />
      </Suspense>

      <Suspense fallback={<TodaySkeleton />}>
        <TodayAsync />
      </Suspense>

      <Suspense fallback={<Skeleton height={120} />}>
        <OtherPendingAsync />
      </Suspense>

      <NotificationBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton height={300} label="Cargando pipeline..." />}>
            <PipelineSectionAsync />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<Skeleton height={300} label="Cargando actividad..." />}>
            <RecentActivityAsync />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
