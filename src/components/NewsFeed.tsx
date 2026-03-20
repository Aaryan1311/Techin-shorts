"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import NewsCard from "./NewsCard";
import type { NewsItem } from "./NewsCard";
import CardSkeleton from "./CardSkeleton";
import { fetchNews, fetchAdminNews } from "@/lib/api";

type SearchSort = "relevant" | "recent" | "trending";

export default function NewsFeed() {
  const { data: session, status } = useSession();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Header hide/show state
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollTop = useRef(0);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NewsItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchSort, setSearchSort] = useState<SearchSort>("relevant");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Track current card via scroll position + header hide/show
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;
    const container = feedRef.current;
    const scrollTop = container.scrollTop;
    const cardHeight = container.clientHeight;
    if (cardHeight === 0) return;

    const idx = Math.round(scrollTop / cardHeight);
    setCurrentIndex(Math.min(idx, news.length - 1));

    // Header hide/show logic
    if (idx === 0 && scrollTop < 50) {
      // Always show on first card
      setHeaderVisible(true);
    } else if (scrollTop > lastScrollTop.current + 20) {
      // Scrolling down — hide
      setHeaderVisible(false);
    } else if (scrollTop < lastScrollTop.current - 20) {
      // Scrolling up — show
      setHeaderVisible(true);
    }
    lastScrollTop.current = scrollTop;
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
      // "/" opens search (unless typing in an input)
      if (e.key === "/" && !searchOpen && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      // Escape closes search
      if (e.key === "Escape" && searchOpen) {
        closeSearch();
        return;
      }

      if (searchOpen) return; // Don't navigate while search is open

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
  }, [currentIndex, scrollToIndex, searchOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Search logic
  const performSearch = useCallback(async (query: string, sort: SearchSort) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/news/search?q=${encodeURIComponent(query.trim())}&sort=${sort}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      // silent
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setSearchResults(null);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      performSearch(value, searchSort);
    }, 500);
  }, [performSearch, searchSort]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    performSearch(searchQuery, searchSort);
  }, [performSearch, searchQuery, searchSort]);

  const handleSortChange = useCallback((sort: SearchSort) => {
    setSearchSort(sort);
    if (searchQuery.trim()) {
      performSearch(searchQuery, sort);
    }
  }, [performSearch, searchQuery]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

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

  const isSearchMode = searchOpen && searchResults !== null;

  return (
    <div className="flex h-dvh flex-col bg-gray-950">
      {/* Header */}
      <header
        className={`sticky top-0 z-20 border-b bg-gray-950/80 backdrop-blur-xl transition-transform duration-300 ease-in-out ${
          headerVisible ? "translate-y-0" : "-translate-y-full"
        } ${currentIndex > 0 && headerVisible ? "border-white/10 shadow-lg shadow-black/20" : "border-white/5"}`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left side — logo (hidden when search expanded on mobile) */}
          <div className={`flex items-center gap-3 transition-all duration-300 ${searchOpen ? "hidden sm:flex sm:shrink-0" : ""}`}>
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

          {/* Search bar (expandable) */}
          {searchOpen ? (
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-1 items-center gap-2 sm:ml-4"
            >
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Search news..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-8 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setSearchResults(null); searchInputRef.current?.focus(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-500 hover:text-white"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              {/* Search icon */}
              <button
                onClick={() => setSearchOpen(true)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Search"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

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
          )}
        </div>
      </header>

      {/* Fetch toast */}
      {fetchMsg && (
        <div className="mx-4 mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          {fetchMsg}
        </div>
      )}

      {/* Search results mode */}
      {isSearchMode ? (
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
          {/* Sort pills */}
          <div className="mb-4 flex items-center gap-2">
            {(["relevant", "recent", "trending"] as SearchSort[]).map((sort) => (
              <button
                key={sort}
                onClick={() => handleSortChange(sort)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-all ${
                  searchSort === sort
                    ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
                }`}
              >
                {sort}
              </button>
            ))}
          </div>

          {searchLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg className="mb-3 h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm text-gray-400">No articles found for &ldquo;{searchQuery}&rdquo;</p>
              <p className="mt-1 text-xs text-gray-600">Try different keywords</p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-gray-500">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
              </p>
              <div className="space-y-3">
                {searchResults.map((item) => (
                  <SearchResultCard key={item.id} news={item} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Normal feed */
        <>
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
        </>
      )}
    </div>
  );
}

/** Compact card for search results */
function SearchResultCard({ news }: { news: NewsItem }) {
  const timeAgo = getTimeAgo(news.publishedAt || news.createdAt);
  const snippet = news.summary.length > 100 ? news.summary.slice(0, 100) + "..." : news.summary;

  return (
    <a
      href={`/news/${news.id}`}
      className="block rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4 transition-all hover:border-white/20 hover:bg-gray-800/50"
    >
      <div className="mb-2 flex items-center gap-2">
        {news.source && (
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {news.source}
          </span>
        )}
        {news.isTrending && (
          <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23a7.5 7.5 0 01-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.773.5 1.604.5 2.47A7.5 7.5 0 0112 23z"/></svg>
            Trending
          </span>
        )}
        <span className="text-[10px] text-gray-600">{timeAgo}</span>
      </div>
      <h3 className="mb-1 line-clamp-2 text-sm font-bold leading-snug text-white">
        {news.title}
      </h3>
      <p className="text-xs leading-relaxed text-gray-400">
        {snippet}
      </p>
    </a>
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
