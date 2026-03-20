"use client";

export default function CardSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 py-4">
      <div className="flex h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">
        {/* Image placeholder (top 38%) */}
        <div className="w-full shrink-0 animate-shimmer" style={{ height: "38%" }} />

        {/* Content area */}
        <div className="flex flex-1 flex-col px-4 pt-3 pb-3">
          {/* Source + time */}
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-14 animate-shimmer rounded" />
            <div className="h-3 w-10 animate-shimmer rounded" />
          </div>

          {/* Title */}
          <div className="mb-1.5 h-5 w-full animate-shimmer rounded" />
          <div className="mb-3 h-5 w-3/4 animate-shimmer rounded" />

          {/* Summary lines — centered */}
          <div className="flex min-h-0 flex-1 flex-col justify-center space-y-3">
            <div className="h-4 w-full animate-shimmer rounded" />
            <div className="h-4 w-full animate-shimmer rounded" />
            <div className="h-4 w-5/6 animate-shimmer rounded" />
            <div className="h-4 w-4/6 animate-shimmer rounded" />
          </div>

          {/* Audio + likes row */}
          <div className="mb-3 flex items-center gap-3">
            <div className="h-10 flex-1 animate-shimmer rounded-xl" />
            <div className="flex gap-2">
              <div className="h-8 w-14 animate-shimmer rounded-lg" />
              <div className="h-8 w-14 animate-shimmer rounded-lg" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <div className="h-10 animate-shimmer rounded-xl" />
            <div className="h-10 animate-shimmer rounded-xl" />
            <div className="h-10 animate-shimmer rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
