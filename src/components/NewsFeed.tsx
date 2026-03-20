"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import NewsCard from "./NewsCard";
import type { NewsItem } from "./NewsCard";
import CardSkeleton from "./CardSkeleton";
import { fetchNews, fetchAdminNews } from "@/lib/api";

export default function NewsFeed() {
  const { data: session, status } = useSession();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const feedRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const isLoggedIn = status === "authenticated" && !!session?.user;
  const isAdmin = isLoggedIn && (session?.user as { isAdmin?: boolean })?.isAdmin;

  const handleFetchNews = async () => {
    setFetching(true);
    setFetchMsg(null);
    try {
      const secret = prompt("Enter admin secret:");
      if (!secret) {
        setFetching(false);
        return;
      }
      const data = await fetchAdminNews(secret);
      setFetchMsg(data.ok ? `Fetched ${data.processed} new articles` : (data.error || "Failed"));
    } catch {
      setFetchMsg("Network error");
    } finally {
      setFetching(false);
      setTimeout(() => setFetchMsg(null), 5000);
    }
  };

  useEffect(() => {
    setLoading(true);
    setCurrentIndex(0);
    fetchNews({}).then((data) => {
      setNews(data);
      setLoading(false);
    });
  }, []);

  // Track current card via scroll position
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;
    const container = feedRef.current;
    const cardHeight = container.clientHeight;
    if (cardHeight === 0) return;
    const idx = Math.round(container.scrollTop / cardHeight);
    setCurrentIndex(Math.min(idx, news.length - 1));
  }, [news.length]);

  // Scroll to specific index
  const scrollToIndex = useCallback((idx: number) => {
    if (!feedRef.current || idx < 0 || idx >= news.length) return;
    const cardHeight = feedRef.current.clientHeight;
    feedRef.current.scrollTo({ top: idx * cardHeight, behavior: "smooth" });
  }, [news.length]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        scrollToIndex(currentIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        scrollToIndex(currentIndex - 1);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, scrollToIndex]);

  // Touch swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      const elapsed = Date.now() - touchStartTime.current;
      touchStartY.current = null;

      if (Math.abs(deltaY) > 50 && elapsed < 300) {
        if (deltaY > 0) {
          scrollToIndex(currentIndex + 1);
        } else {
          scrollToIndex(currentIndex - 1);
        }
      }
    },
    [currentIndex, scrollToIndex]
  );

  return (
    <div className="flex h-dvh flex-col bg-gray-950">
      {/* Header — logo + auth only */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Techie Shorts</h1>
              <p className="text-[11px] text-gray-500">Dev news in 60 words</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status === "loading" ? null : session?.user ? (
              <>
                <span className="hidden text-sm text-gray-400 sm:inline">
                  {session.user.name || session.user.email}
                </span>
                {isAdmin && (
                  <button
                    onClick={handleFetchNews}
                    disabled={fetching}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    {fetching ? "Fetching..." : "Fetch News"}
                  </button>
                )}
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
      </header>

      {/* Fetch toast */}
      {fetchMsg && (
        <div className="mx-4 mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          {fetchMsg}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex-1 snap-y snap-mandatory overflow-y-auto scrollbar-hide">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-dvh snap-start">
              <CardSkeleton />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-400">No news found</p>
            <p className="mt-1 text-sm text-gray-600">Check back later for fresh content</p>
          </div>
        </div>
      ) : (
        <div
          ref={feedRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex-1 snap-y snap-mandatory overflow-y-auto scrollbar-hide"
        >
          {news.map((item, i) => (
            <div
              key={item.id}
              className="h-dvh snap-start animate-card-in"
            >
              <NewsCard news={item} index={i} total={news.length} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
