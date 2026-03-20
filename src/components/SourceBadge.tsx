"use client";

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  hackernews: { label: "HN", color: "#ff6600" },
  reddit: { label: "Reddit", color: "#ff4500" },
  techcrunch: { label: "TechCrunch", color: "#0a9e01" },
  theverge: { label: "The Verge", color: "#e5127d" },
  github: { label: "GitHub", color: "#8b5cf6" },
  infoq: { label: "InfoQ", color: "#007bff" },
  sdtimes: { label: "SD Times", color: "#1a73e8" },
  bleepingcomputer: { label: "BleepingPC", color: "#c0392b" },
  producthunt: { label: "PH", color: "#da552f" },
  techmeme: { label: "TechMeme", color: "#2563eb" },
  lobsters: { label: "Lobsters", color: "#b91c1c" },
  arstechnica: { label: "Ars", color: "#ff4400" },
};

interface SourceBadgeProps {
  source: string | null;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  if (!source) return null;

  const config = SOURCE_CONFIG[source] || { label: source, color: "#6b7280" };

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider opacity-75"
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
