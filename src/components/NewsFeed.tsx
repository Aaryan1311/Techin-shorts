"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
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
  userInteraction?: string | null;
}

export default function NewsFeed() {
  const { data: session, status } = useSession();
  const [tags, setTags] = useState<Tag[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<"all" | "personal">("all");
  const [loading, setLoading] = useState(true);

  const isLoggedIn = status === "authenticated" && !!session?.user;

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then(setTags);
  }, []);

  // Switch to "all" if user logs out while on "personal"
  useEffect(() => {
    if (!isLoggedIn && feedMode === "personal") {
      setFeedMode("all");
    }
  }, [isLoggedIn, feedMode]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeTag) params.set("tag", activeTag);
    if (feedMode === "personal") params.set("feed", "personal");
    const qs = params.toString();
    const url = `/api/news${qs ? `?${qs}` : ""}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setNews(data);
        setLoading(false);
      });
  }, [activeTag, feedMode]);

  return (
    <div className="flex h-dvh flex-col bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
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

          {/* Auth buttons */}
          <div className="flex items-center gap-2">
            {status === "loading" ? null : session?.user ? (
              <>
                <span className="hidden text-sm text-gray-400 sm:inline">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feed toggle + Tag filter */}
        <div className="flex items-center gap-2 px-4 pb-1 pt-0.5">
          {isLoggedIn && (
            <div className="mr-1 flex shrink-0 rounded-lg border border-white/10 bg-white/5 p-0.5">
              <button
                onClick={() => setFeedMode("all")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  feedMode === "all"
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                All News
              </button>
              <button
                onClick={() => setFeedMode("personal")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  feedMode === "personal"
                    ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                For You
              </button>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <TagFilterBar
              tags={tags}
              activeTag={activeTag}
              onTagSelect={setActiveTag}
            />
          </div>
        </div>
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
              {feedMode === "personal"
                ? "Follow more tags to see personalized news"
                : "Try selecting a different tag"}
            </p>
            {feedMode === "personal" && (
              <button
                onClick={() => setFeedMode("all")}
                className="mt-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-400 transition-all hover:bg-indigo-500/20"
              >
                Browse All News
              </button>
            )}
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
