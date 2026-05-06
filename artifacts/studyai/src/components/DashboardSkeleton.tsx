import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${className ?? ""}`}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-8 h-8 rounded-xl" />
        <Skeleton className="h-3 w-24 rounded-full" />
      </div>
      <Skeleton className="h-10 w-20 rounded-lg mb-2" />
      <Skeleton className="h-3 w-32 rounded-full" />
    </div>
  );
}

function SkeletonKpi() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="w-8 h-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16 rounded-lg mb-1" />
      <Skeleton className="h-2.5 w-24 rounded-full" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
      <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-3 w-40 rounded-full" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <Skeleton className="h-3 w-14 rounded-full flex-shrink-0" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
      </div>

      {/* Chart placeholder */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-5">
          <Skeleton className="w-7 h-7 rounded-xl" />
          <Skeleton className="h-4 w-36 rounded-full" />
        </div>
        <Skeleton className="w-full h-48 rounded-xl" />
      </div>

      {/* History rows */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}
