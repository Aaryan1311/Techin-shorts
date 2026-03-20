"use client";

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  hackernews: { label: "Hacker News", color: "#ff6600" },
  devto: { label: "DEV.to", color: "#3b49df" },
  reddit: { label: "Reddit", color: "#ff4500" },
  techcrunch: { label: "TechCrunch", color: "#0a9e01" },
  theverge: { label: "The Verge", color: "#e5127d" },
  github: { label: "GitHub", color: "#8b5cf6" },
};

interface SourceBadgeProps {
  source: string | null;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  if (!source) return null;

  const config = SOURCE_CONFIG[source] || { label: source, color: "#6b7280" };

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{
        backgroundColor: `${config.color}18`,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      via {config.label}
    </span>
  );
}
