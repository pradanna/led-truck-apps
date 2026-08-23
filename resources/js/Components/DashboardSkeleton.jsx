import React from 'react';

export function SkeletonBox({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`} />
  );
}

export function SkeletonMetricCard() {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-3 w-28" />
        <SkeletonBox className="h-8 w-8 rounded-xl" />
      </div>
      <div className="space-y-2 mt-2">
        <SkeletonBox className="h-6 w-36" />
        <SkeletonBox className="h-3 w-24" />
      </div>
    </div>
  );
}

export function SkeletonActiveMedia() {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-12 rounded-xl bg-slate-200 shrink-0" />
        <div className="space-y-2">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-48 bg-slate-300 rounded" />
          <div className="h-3 w-32 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="h-6 w-28 bg-slate-200 rounded-full" />
    </div>
  );
}

export function SkeletonPlaylogList() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between animate-pulse">
          <div className="space-y-1.5 flex-1 pr-4">
            <div className="h-3 w-3/4 bg-slate-200 rounded" />
            <div className="h-2.5 w-20 bg-slate-200 rounded" />
          </div>
          <div className="h-4 w-12 bg-slate-200 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CctvCameraCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-300" />
          <div className="h-4 w-32 bg-slate-300 rounded" />
        </div>
        <div className="h-5 w-20 bg-slate-200 rounded-full" />
      </div>
      
      {/* 16:9 Aspect Video Frame Skeleton */}
      <div className="w-full aspect-video bg-slate-900/80 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-2">
          <div className="w-4 h-4 bg-slate-600 rounded" />
        </div>
        <div className="h-3 w-36 bg-slate-700 rounded" />
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="h-3 w-28 bg-slate-200 rounded" />
        <div className="flex items-center gap-1.5">
          <div className="h-7 w-7 bg-slate-200 rounded-lg" />
          <div className="h-7 w-7 bg-slate-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonPlaylistGrid() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4 animate-pulse">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-slate-200" />
          <div className="h-4 w-44 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-5 w-32 bg-slate-200 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-16 bg-slate-200 rounded" />
              <div className="h-4 w-14 bg-slate-200 rounded-full" />
            </div>
            <div className="w-full h-32 rounded-xl bg-slate-200" />
            <div className="space-y-2">
              <div className="h-3.5 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-200 rounded" />
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <div className="h-3 w-12 bg-slate-200 rounded" />
              <div className="h-6 w-20 bg-slate-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonNovastarCard() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-full space-y-4 animate-pulse">
      <div>
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
          <div className="w-5 h-5 rounded-md bg-slate-200" />
          <div className="h-4 w-44 bg-slate-200 rounded-lg" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-1.5 border-t border-slate-50 first:border-none">
              <div className="h-3.5 w-28 bg-slate-200 rounded" />
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonPlaylogTable() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mt-6 space-y-4 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1.5">
          <div className="h-4 w-48 bg-slate-200 rounded-lg" />
          <div className="h-3 w-32 bg-slate-200 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-40 bg-slate-100 rounded-xl" />
          <div className="h-9 w-24 bg-slate-200 rounded-xl" />
        </div>
      </div>
      <div className="space-y-2.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-11 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between px-4">
            <div className="h-3 w-1/6 bg-slate-200 rounded" />
            <div className="h-3 w-1/4 bg-slate-200 rounded" />
            <div className="h-3 w-1/6 bg-slate-200 rounded" />
            <div className="h-4 w-14 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCampaignGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between"
        >
          <div>
            {/* Aspect Video Preview Skeleton */}
            <div className="aspect-video bg-slate-200 relative">
              <div className="absolute top-3 left-3 h-5 w-16 bg-slate-300 rounded-lg" />
            </div>

            {/* Content Details Skeleton */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 bg-slate-200 rounded" />
                <div className="h-3 w-16 bg-slate-200 rounded" />
              </div>
              <div className="h-4 w-4/5 bg-slate-300 rounded" />
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-3/5 bg-slate-200 rounded" />
                <div className="h-3 w-2/5 bg-slate-200 rounded" />
              </div>
            </div>
          </div>

          {/* Card Footer Actions Skeleton */}
          <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="h-7 w-20 bg-slate-200 rounded-lg" />
            <div className="h-7 w-16 bg-slate-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonReportOverview() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 4 KPI Metrics Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-28 bg-slate-200 rounded" />
              <div className="h-7 w-32 bg-slate-300 rounded-lg" />
              <div className="h-2.5 w-24 bg-slate-200 rounded" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Grid 2 Cols Table & Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="space-y-1.5 pb-2">
            <div className="h-4 w-48 bg-slate-300 rounded" />
            <div className="h-3 w-64 bg-slate-200 rounded" />
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between px-4">
                <div className="h-3 w-1/3 bg-slate-200 rounded" />
                <div className="h-3 w-1/6 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="space-y-1.5 pb-2">
            <div className="h-4 w-36 bg-slate-300 rounded" />
            <div className="h-3 w-48 bg-slate-200 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-4 w-36 bg-slate-300 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonReportTraffic() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="w-7 h-7 rounded-lg bg-slate-200" />
            </div>
            <div className="h-7 w-16 bg-slate-300 rounded-lg" />
            <div className="h-2.5 w-24 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="space-y-1.5">
          <div className="h-4 w-52 bg-slate-300 rounded" />
          <div className="h-3 w-64 bg-slate-200 rounded" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-3 bg-slate-200 rounded" />
              <div className="flex-1 h-4 bg-slate-100 rounded-full" />
              <div className="w-12 h-3 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonReportGps() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-6 w-28 bg-slate-300 rounded-lg" />
              <div className="h-2.5 w-20 bg-slate-200 rounded" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="space-y-1.5 pb-2">
          <div className="h-4 w-52 bg-slate-300 rounded" />
          <div className="h-3 w-72 bg-slate-200 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              <div className="space-y-1.5 w-1/3">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-3 w-44 bg-slate-300 rounded" />
              </div>
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="h-4 w-24 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
