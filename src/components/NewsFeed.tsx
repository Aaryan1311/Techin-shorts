"use client";

import { useState, useEffect } from "react";
import TagFilterBar from "./TagFilterBar";
import NewsCard from "./NewsCard";

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
}

export default function NewsFeed() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then(setTags);
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = activeTag ? `/api/news?tag=${activeTag}` : "/api/news";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setNews(data);
        setLoading(false);
      });
  }, [activeTag]);

  return (
    <div className="flex h-dvh flex-col bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Logo */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Techie Shorts</h1>
            <p className="text-xs text-gray-500">Dev news in 60 words</p>
          </div>
        </div>

        {/* Tag filter */}
        <TagFilterBar
          tags={tags}
          activeTag={activeTag}
          onTagSelect={setActiveTag}
        />
      </header>

      {/* Feed */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-sm text-gray-500">Loading news...</span>
          </div>
        </div>
      ) : news.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-400">No news found</p>
            <p className="mt-1 text-sm text-gray-600">
              Try selecting a different tag
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 snap-y snap-mandatory overflow-y-auto">
          {news.map((item, i) => (
            <div key={item.id} className="h-dvh snap-start">
              <NewsCard news={item} index={i} total={news.length} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
