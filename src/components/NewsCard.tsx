"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import AudioPlayer, { type Lang } from "./AudioPlayer";
import SharePopup from "./SharePopup";
import SourceBadge from "./SourceBadge";
import { interactWithNews, translateNews, saveLanguagePreference } from "@/lib/api";
import { trackEvent } from "@/lib/tracker";
import { getFallbackImage } from "@/lib/fallbackImages";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  source: string | null;
  imageUrl: string | null;
  likeCount: number;
  dislikeCount: number;
  viewCount: number;
  publishedAt: string;
  createdAt: string;
  tags: Tag[];
  userInteraction?: string | null;
  summaryHi?: string | null;
  summaryHinglish?: string | null;
  audioUrlEn?: string | null;
  audioUrlHi?: string | null;
  audioUrlHinglish?: string | null;
  isTrending?: boolean;
}

interface NewsCardProps {
  news: NewsItem;
  index: number;
  total: number;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

const LS_KEY = "techie-shorts-audio-lang";

export default function NewsCard({ news }: NewsCardProps) {
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
  const [likeAnim, setLikeAnim] = useState(false);
  const [dislikeAnim, setDislikeAnim] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const [lang, setLang] = useState<Lang>("EN");
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track VIEW when card is visible for > 0.5s via IntersectionObserver
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            trackEvent(news.id, "VIEW");
            // Start 5s timer for READ_SUMMARY
            readTimerRef.current = setTimeout(() => {
              trackEvent(news.id, "READ_SUMMARY");
            }, 5000);
          } else {
            // Clear timer if scrolled away
            if (readTimerRef.current) {
              clearTimeout(readTimerRef.current);
              readTimerRef.current = null;
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (readTimerRef.current) clearTimeout(readTimerRef.current);
    };
  }, [news.id]);

  // Get cached translation from the news object if available
  const getCachedTranslation = useCallback((targetLang: Lang): string | null => {
    if (targetLang === "HI") return news.summaryHi || null;
    if (targetLang === "HINGLISH") return news.summaryHinglish || null;
    return null;
  }, [news.summaryHi, news.summaryHinglish]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as Lang | null;
      if (saved && (saved === "EN" || saved === "HI" || saved === "HINGLISH")) {
        setLang(saved);
        if (saved !== "EN") {
          // Use cached translation if available, otherwise fetch
          const cached = getCachedTranslation(saved);
          if (cached) {
            setTranslatedText(cached);
          } else {
            fetchTranslation(saved, news.id);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [news.id, getCachedTranslation]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTranslatedText(null);
    setImgFailed(false);
  }, [news.id]);

  const fetchTranslation = async (targetLang: Lang, newsId: string) => {
    // Check cached value first
    const cached = getCachedTranslation(targetLang);
    if (cached) {
      setTranslatedText(cached);
      return;
    }
    setTranslating(true);
    try {
      const data = await translateNews(newsId, targetLang);
      if (data) setTranslatedText(data.text);
    } catch {
      // keep original
    } finally {
      setTranslating(false);
    }
  };

  const handleLangChange = useCallback(
    (newLang: Lang) => {
      setLang(newLang);
      setTranslatedText(null);
      try {
        localStorage.setItem(LS_KEY, newLang);
      } catch {
        // ignore
      }
      saveLanguagePreference(newLang);
      if (newLang !== "EN") {
        fetchTranslation(newLang, news.id);
      }
    },
    [news.id]
  );

  const handleInteract = async (type: "LIKE" | "DISLIKE") => {
    const isLike = type === "LIKE";
    const currentVote = isLike ? "like" : "dislike";

    if (isLike) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 300);
    } else {
      setDislikeAnim(true);
      setTimeout(() => setDislikeAnim(false), 300);
    }

    if (voted === currentVote) {
      if (isLike) setLikes((l) => l - 1);
      else setDislikes((d) => d - 1);
      setVoted(null);
    } else {
      if (voted === "like") setLikes((l) => l - 1);
      if (voted === "dislike") setDislikes((d) => d - 1);
      if (isLike) setLikes((l) => l + 1);
      else setDislikes((d) => d + 1);
      setVoted(currentVote);
    }

    const data = await interactWithNews(news.id, type);
    setLikes(data.likeCount);
    setDislikes(data.dislikeCount);
    setVoted(
      data.userInteraction === "LIKE"
        ? "like"
        : data.userInteraction === "DISLIKE"
          ? "dislike"
          : null
    );
  };

  const handleShare = () => {
    setShowShare(true);
  };

  const displaySummary =
    lang === "EN" ? news.summary : translatedText || news.summary;

  const timeAgo = getTimeAgo(news.publishedAt || news.createdAt);
  const tagSlugs = news.tags.map((t) => t.slug);
  const imageUrl = (!imgFailed && news.imageUrl) || getFallbackImage(tagSlugs, news.title);

  return (
    <>
      <div ref={cardRef} className="flex h-full w-full items-center justify-center px-4 py-4">
        <div className="relative flex h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">

          {/* Image at top of card (35-40%) */}
          <div className="relative w-full shrink-0" style={{ height: "38%" }}>
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-900 to-transparent" />
          </div>

          {/* Content area */}
          <div className="flex min-h-0 flex-1 flex-col px-4 pt-3 pb-3">
            {/* Source + time + share row */}
            <div className="mb-2 flex items-center gap-2">
              <SourceBadge source={news.source} />
              {news.isTrending && (
                <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23a7.5 7.5 0 01-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.773.5 1.604.5 2.47A7.5 7.5 0 0112 23z"/></svg>
                  Trending
                </span>
              )}
              <span className="text-[10px] text-gray-600">{timeAgo}</span>
              <button
                onClick={handleShare}
                className="ml-auto rounded-lg p-1.5 text-gray-500 transition-all hover:bg-white/10 hover:text-white"
                aria-label="Share"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>

            {/* Title */}
            <h2 className="mb-3 line-clamp-3 text-lg font-bold leading-snug text-white sm:text-xl">
              {news.title}
            </h2>

            {/* Summary — vertically centered in remaining space */}
            <div className="relative flex min-h-0 flex-1 items-center">
              <p
                className={`line-clamp-6 text-sm leading-relaxed text-gray-300 transition-opacity duration-200 sm:text-base sm:leading-7 ${
                  translating ? "opacity-50" : "opacity-100"
                }`}
              >
                {displaySummary}
              </p>
              {translating && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              )}
            </div>

            {/* Audio + Like/Dislike row */}
            <div className="mb-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <AudioPlayer
                  newsId={news.id}
                  lang={lang}
                  onLangChange={handleLangChange}
                  cachedAudioUrls={{
                    EN: news.audioUrlEn || null,
                    HI: news.audioUrlHi || null,
                    HINGLISH: news.audioUrlHinglish || null,
                  }}
                />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleInteract("LIKE")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                    likeAnim ? "animate-vote-pop" : ""
                  } ${
                    voted === "like"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                  }`}
                >
                  <svg
                    className="h-4 w-4"
                    fill={voted === "like" ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={voted === "like" ? 0 : 1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                  </svg>
                  {likes > 0 && <span className="font-medium">{formatCount(likes)}</span>}
                </button>
                <button
                  onClick={() => handleInteract("DISLIKE")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                    dislikeAnim ? "animate-vote-pop" : ""
                  } ${
                    voted === "dislike"
                      ? "bg-red-500/15 text-red-400"
                      : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                  }`}
                >
                  <svg
                    className="h-4 w-4"
                    fill={voted === "dislike" ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={voted === "dislike" ? 0 : 1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
                  </svg>
                  {dislikes > 0 && <span className="font-medium">{formatCount(dislikes)}</span>}
                </button>
              </div>
            </div>

            {/* Action buttons — pinned at bottom */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { trackEvent(news.id, "CLICK_DETAIL"); router.push(`/news/${news.id}`); }}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2.5 text-xs font-medium text-gray-300 backdrop-blur-sm transition-all hover:bg-white/[0.09] hover:text-white active:scale-[0.97] sm:text-sm"
              >
                <svg className="h-3.5 w-3.5 shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Read More
              </button>
              <button
                onClick={() => { trackEvent(news.id, "CLICK_FUTURE"); router.push(`/news/${news.id}/whats-next`); }}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2.5 text-xs font-medium text-gray-300 backdrop-blur-sm transition-all hover:bg-white/[0.09] hover:text-white active:scale-[0.97] sm:text-sm"
              >
                <svg className="h-3.5 w-3.5 shrink-0 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
                What&apos;s Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {showShare && (
        <SharePopup
          newsId={news.id}
          title={news.title}
          summary={news.summary}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
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
