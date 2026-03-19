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
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onTagSelect(tag.slug)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            activeTag === tag.slug
              ? "text-white shadow-lg"
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
          {tag.name}
        </button>
      ))}
    </div>
  );
}
