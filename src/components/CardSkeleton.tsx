"use client";

export default function CardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col bg-gray-950">
      {/* Image placeholder (top 38%) */}
      <div className="relative w-full animate-shimmer bg-gray-900" style={{ height: "38%" }}>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-950 to-transparent" />
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col px-4 pt-4">
        {/* Source + time */}
        <div className="mb-3 flex items-center gap-2">
          <div className="h-4 w-14 animate-shimmer rounded bg-gray-800" />
          <div className="h-3 w-10 animate-shimmer rounded bg-gray-800/60" />
        </div>

        {/* Title */}
        <div className="mb-1.5 h-6 w-full animate-shimmer rounded bg-gray-800" />
        <div className="mb-4 h-6 w-3/4 animate-shimmer rounded bg-gray-800" />

        {/* Summary lines */}
        <div className="flex-1 space-y-3 py-4">
          <div className="h-4 w-full animate-shimmer rounded bg-gray-800/50" />
          <div className="h-4 w-full animate-shimmer rounded bg-gray-800/50" />
          <div className="h-4 w-5/6 animate-shimmer rounded bg-gray-800/50" />
          <div className="h-4 w-4/6 animate-shimmer rounded bg-gray-800/50" />
        </div>

        {/* Audio + likes row */}
        <div className="mb-3 flex items-center gap-3">
          <div className="h-10 flex-1 animate-shimmer rounded-xl bg-gray-800/30" />
          <div className="flex gap-2">
            <div className="h-8 w-14 animate-shimmer rounded-lg bg-gray-800/30" />
            <div className="h-8 w-14 animate-shimmer rounded-lg bg-gray-800/30" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 pb-4">
          <div className="h-10 animate-shimmer rounded-xl bg-gray-800/30" />
          <div className="h-10 animate-shimmer rounded-xl bg-gray-800/30" />
          <div className="h-10 animate-shimmer rounded-xl bg-gray-800/30" />
        </div>
      </div>
    </div>
  );
}
