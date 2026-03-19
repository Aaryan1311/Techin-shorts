"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  imageUrl: string | null;
  likeCount: number;
  dislikeCount: number;
  viewCount: number;
  publishedAt: string;
  createdAt: string;
  tags: Tag[];
  userInteraction?: string | null;
}

interface NewsCardProps {
  news: NewsItem;
  index: number;
  total: number;
}

export default function NewsCard({ news, index, total }: NewsCardProps) {
  const router = useRouter();
  const [likes, setLikes] = useState(news.likeCount);
  const [dislikes, setDislikes] = useState(news.dislikeCount);
  const [voted, setVoted] = useState<"like" | "dislike" | null>(
    news.userInteraction === "LIKE"
      ? "like"
      : news.userInteraction === "DISLIKE"
        ? "dislike"
        : null
  );

  const handleInteract = async (type: "LIKE" | "DISLIKE") => {
    const isLike = type === "LIKE";
    const currentVote = isLike ? "like" : "dislike";

    // Optimistic update
    if (voted === currentVote) {
      // Toggle off
      if (isLike) setLikes((l) => l - 1);
      else setDislikes((d) => d - 1);
      setVoted(null);
    } else {
      // Switch or new vote
      if (voted === "like") setLikes((l) => l - 1);
      if (voted === "dislike") setDislikes((d) => d - 1);
      if (isLike) setLikes((l) => l + 1);
      else setDislikes((d) => d + 1);
      setVoted(currentVote);
    }

    const res = await fetch(`/api/news/${news.id}/interact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });

    if (res.ok) {
      const data = await res.json();
      setLikes(data.likeCount);
      setDislikes(data.dislikeCount);
      setVoted(
        data.userInteraction === "LIKE"
          ? "like"
          : data.userInteraction === "DISLIKE"
            ? "dislike"
            : null
      );
    }
  };

  const timeAgo = getTimeAgo(news.publishedAt || news.createdAt);

  return (
    <div className="flex h-full w-full items-center justify-center px-4 py-6">
      <div className="flex h-full w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-6 shadow-2xl">
        {/* Card counter */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {index + 1} / {total}
          </span>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-2">
          {news.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>

        {/* Title */}
        <h2 className="mb-4 text-xl font-bold leading-tight text-white sm:text-2xl">
          {news.title}
        </h2>

        {/* Summary */}
        <p className="mb-6 flex-1 text-base leading-relaxed text-gray-300">
          {news.summary}
        </p>

        {/* Action buttons */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          <button
            onClick={() => router.push(`/news/${news.id}`)}
            className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2.5 text-xs font-semibold text-indigo-400 transition-all hover:bg-indigo-500/20 sm:text-sm"
          >
            Read Detail
          </button>
          <button
            onClick={() => router.push(`/news/${news.id}/future`)}
            className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2.5 text-xs font-semibold text-purple-400 transition-all hover:bg-purple-500/20 sm:text-sm"
          >
            Future Impact
          </button>
          <button
            onClick={() => router.push(`/news/${news.id}/build`)}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 sm:text-sm"
          >
            Build on This
          </button>
        </div>

        {/* Bottom row: source + reactions */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          {/* Source */}
          <a
            href={news.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-300"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Source
          </a>

          {/* Reactions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleInteract("LIKE")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                voted === "like"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              }`}
            >
              <svg
                className="h-4 w-4"
                fill={voted === "like" ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"
                />
              </svg>
              <span className="font-medium">{likes}</span>
            </button>
            <button
              onClick={() => handleInteract("DISLIKE")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                voted === "dislike"
                  ? "bg-red-500/20 text-red-400"
                  : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              }`}
            >
              <svg
                className="h-4 w-4"
                fill={voted === "dislike" ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"
                />
              </svg>
              <span className="font-medium">{dislikes}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
