"use client";

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  hackernews: { label: "HackerNews", color: "#ff6600" },
  reddit: { label: "Reddit", color: "#ff4500" },
  techcrunch: { label: "TechCrunch", color: "#0a9e01" },
  theverge: { label: "The Verge", color: "#e5127d" },
  github: { label: "GitHub", color: "#8b5cf6" },
  infoq: { label: "InfoQ", color: "#007bff" },
  sdtimes: { label: "SD Times", color: "#1a73e8" },
  bleepingcomputer: { label: "BleepingPC", color: "#c0392b" },
  producthunt: { label: "Product Hunt", color: "#da552f" },
  techmeme: { label: "TechMeme", color: "#2563eb" },
  lobsters: { label: "Lobsters", color: "#b91c1c" },
  arstechnica: { label: "Ars Technica", color: "#ff4400" },
  inc42: { label: "Inc42", color: "#0066cc" },
  yourstory: { label: "YourStory", color: "#e91e63" },
  "google-ai": { label: "Google AI", color: "#4285f4" },
  smashingmagazine: { label: "Smashing Magazine", color: "#e53e3e" },
  "css-tricks": { label: "CSS-Tricks", color: "#f5a623" },
  androidauthority: { label: "Android Authority", color: "#3ddc84" },
  moneycontrol: { label: "MoneyControl", color: "#5b2c8e" },
  "et-tech": { label: "ET Tech", color: "#1a237e" },
  "livemint-tech": { label: "LiveMint", color: "#e65100" },
  "mint-startups": { label: "LiveMint Startups", color: "#ef6c00" },
};

interface SourceBadgeProps {
  source: string | null;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  if (!source) return null;

  const config = SOURCE_CONFIG[source] || {
    label: source.charAt(0).toUpperCase() + source.slice(1),
    color: "#6b7280",
  };

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider opacity-75"
      style={{
        backgroundColor: `${config.color}18`,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      {config.label}
    </span>
  );
}
