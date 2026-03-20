"use client";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface TagFilterBarProps {
  tags: Tag[];
  activeTag: string | null;
  onTagSelect: (slug: string | null) => void;
}

export default function TagFilterBar({
  tags,
  activeTag,
  onTagSelect,
}: TagFilterBarProps) {
  // Put "trending" first in the tag list (after the All button)
  const trendingTag = tags.find((t) => t.slug === "trending");
  const otherTags = tags.filter((t) => t.slug !== "trending");
  const sortedTags = trendingTag ? [trendingTag, ...otherTags] : otherTags;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
      <button
        onClick={() => onTagSelect(null)}
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          activeTag === null
            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
            : "bg-white/10 text-gray-300 hover:bg-white/15"
        }`}
      >
        All
      </button>
      {sortedTags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onTagSelect(tag.slug)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            activeTag === tag.slug
              ? "text-white shadow-lg"
              : tag.slug === "trending"
                ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                : "bg-white/10 text-gray-300 hover:bg-white/15"
          }`}
          style={
            activeTag === tag.slug
              ? {
                  backgroundColor: tag.color,
                  boxShadow: `0 4px 14px ${tag.color}40`,
                }
              : undefined
          }
        >
          {tag.slug === "trending" ? `🔥 ${tag.name}` : tag.name}
        </button>
      ))}
    </div>
  );
}
