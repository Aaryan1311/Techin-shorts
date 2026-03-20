"use client";

interface ProgressDotsProps {
  total: number;
  current: number;
}

export default function ProgressDots({ total, current }: ProgressDotsProps) {
  // Show a window of dots around the current position for large feeds
  const maxVisible = 12;
  let start = 0;
  let end = total;

  if (total > maxVisible) {
    start = Math.max(0, current - Math.floor(maxVisible / 2));
    end = Math.min(total, start + maxVisible);
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 py-1">
      {start > 0 && (
        <span className="h-1 w-1 rounded-full bg-white/20" />
      )}
      {Array.from({ length: end - start }, (_, i) => {
        const idx = start + i;
        const isActive = idx === current;
        return (
          <span
            key={idx}
            className={`rounded-full transition-all duration-300 ${
              isActive
                ? "h-1.5 w-4 bg-indigo-400"
                : "h-1.5 w-1.5 bg-white/20"
            }`}
          />
        );
      })}
      {end < total && (
        <span className="h-1 w-1 rounded-full bg-white/20" />
      )}
    </div>
  );
}
