"use client";

export default function CardSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 py-6">
      <div className="flex h-full w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-6 shadow-2xl">
        {/* Top bar skeleton */}
        <div className="mb-4 flex items-center justify-between">
          <div className="h-3 w-12 animate-pulse rounded bg-white/5" />
          <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
        </div>

        {/* Tag pills */}
        <div className="mb-4 flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-white/5" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-white/5" />
        </div>

        {/* Gradient accent */}
        <div className="mb-4 h-1 w-16 animate-pulse rounded-full bg-indigo-500/20" />

        {/* Title */}
        <div className="mb-2 h-6 w-full animate-pulse rounded bg-white/8" />
        <div className="mb-4 h-6 w-3/4 animate-pulse rounded bg-white/8" />

        {/* Summary lines */}
        <div className="mb-4 flex-1 space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-white/5" />
          <div className="h-4 w-full animate-pulse rounded bg-white/5" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-white/5" />
        </div>

        {/* Audio player skeleton */}
        <div className="mb-4 h-11 animate-pulse rounded-xl bg-white/[0.03]" />

        {/* Action buttons */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          <div className="h-10 animate-pulse rounded-xl bg-white/5" />
          <div className="h-10 animate-pulse rounded-xl bg-white/5" />
          <div className="h-10 animate-pulse rounded-xl bg-white/5" />
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <div className="h-4 w-16 animate-pulse rounded bg-white/5" />
          <div className="flex gap-3">
            <div className="h-8 w-16 animate-pulse rounded-lg bg-white/5" />
            <div className="h-8 w-16 animate-pulse rounded-lg bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
