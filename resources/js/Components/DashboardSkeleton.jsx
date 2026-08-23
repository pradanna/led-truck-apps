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
