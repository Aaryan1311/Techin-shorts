"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AudioPlayer, { type Lang } from "./AudioPlayer";
import SharePopup from "./SharePopup";
import SourceBadge from "./SourceBadge";
import { interactWithNews, translateNews, saveLanguagePreference } from "@/lib/api";

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

  // Language + translation state
  const [lang, setLang] = useState<Lang>("EN");
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as Lang | null;
      if (saved && (saved === "EN" || saved === "HI" || saved === "HINGLISH")) {
        setLang(saved);
        if (saved !== "EN") {
          fetchTranslation(saved, news.id);
        }
      }
    } catch {
      // ignore
    }
  }, [news.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTranslatedText(null);
    setImgFailed(false);
  }, [news.id]);

  const fetchTranslation = async (targetLang: Lang, newsId: string) => {
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

  const handleShare = async () => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/news/${news.id}`
        : `/news/${news.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: news.title,
          text: `${news.title} — Techie Shorts`,
          url: shareUrl,
        });
      } catch {
        // cancelled
      }
      return;
    }

    setShowShare(true);
  };

  const displaySummary =
    lang === "EN" ? news.summary : translatedText || news.summary;

  const timeAgo = getTimeAgo(news.publishedAt || news.createdAt);
  const hasImage = !!news.imageUrl && !imgFailed;
  const primaryTag = news.tags[0];

  return (
    <>
      <div className="flex h-full w-full flex-col bg-gray-950">
        {/* ── Image section (top 38%) or colored accent ── */}
        {hasImage ? (
          <div className="relative w-full" style={{ height: "38%" }}>
            <img
              src={news.imageUrl!}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
            />
            {/* Bottom gradient blend */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-950 to-transparent" />
            {/* Share button over image */}
            <button
              onClick={handleShare}
              className="absolute right-3 top-3 rounded-full bg-black/40 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
              aria-label="Share"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="relative w-full">
            {/* Thin colored accent bar using primary tag color */}
            <div
              className="h-1.5 w-full"
              style={{
                background: primaryTag
                  ? `linear-gradient(90deg, ${primaryTag.color}, ${primaryTag.color}80, transparent)`
                  : "linear-gradient(90deg, #6366f1, #a855f7, transparent)",
              }}
            />
            {/* Share button (no-image layout) */}
            <button
              onClick={handleShare}
              className="absolute right-4 top-4 rounded-full bg-white/5 p-2 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Share"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Content section (fills remaining space) ── */}
        <div className="flex min-h-0 flex-1 flex-col px-4 pt-4">
          {/* Source + time row */}
          <div className="mb-2 flex items-center gap-2">
            <SourceBadge source={news.source} />
            <span className="text-[10px] text-gray-600">{timeAgo}</span>
            {!hasImage && (
              <a
                href={news.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-[10px] text-gray-600 transition-colors hover:text-gray-400"
              >
                Source
              </a>
            )}
          </div>

          {/* Title */}
          <h2 className="mb-3 line-clamp-3 text-xl font-bold leading-snug text-white sm:text-2xl">
            {news.title}
          </h2>

          {/* Summary — vertically centered in available space */}
          <div className="relative flex min-h-0 flex-1 items-center">
            <p
              className={`line-clamp-6 text-[15px] leading-relaxed text-gray-300 transition-opacity duration-200 sm:text-base sm:leading-7 ${
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
          <div className="grid grid-cols-3 gap-2 pb-4">
            <button
              onClick={() => router.push(`/news/${news.id}`)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] px-3 py-2.5 text-xs font-medium text-gray-300 backdrop-blur-sm transition-all hover:bg-white/[0.09] hover:text-white active:scale-[0.97] sm:text-sm"
            >
              <svg className="h-3.5 w-3.5 shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="hidden min-[375px]:inline">Read Detail</span>
              <span className="min-[375px]:hidden">Detail</span>
            </button>
            <button
              onClick={() => router.push(`/news/${news.id}/future`)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] px-3 py-2.5 text-xs font-medium text-gray-300 backdrop-blur-sm transition-all hover:bg-white/[0.09] hover:text-white active:scale-[0.97] sm:text-sm"
            >
              <svg className="h-3.5 w-3.5 shrink-0 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="hidden min-[375px]:inline">Future Impact</span>
              <span className="min-[375px]:hidden">Future</span>
            </button>
            <button
              onClick={() => router.push(`/news/${news.id}/build`)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] px-3 py-2.5 text-xs font-medium text-gray-300 backdrop-blur-sm transition-all hover:bg-white/[0.09] hover:text-white active:scale-[0.97] sm:text-sm"
            >
              <svg className="h-3.5 w-3.5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-3.19A.6.6 0 016 11.5V7.5a.6.6 0 01.036-.48l5.384-3.19a.6.6 0 01.58 0l5.384 3.19A.6.6 0 0118 7.5v4a.6.6 0 01-.036.48l-5.384 3.19a.6.6 0 01-.58 0zM3.27 6.96L12 12.01m0 0l8.73-5.05M12 12.01V21.5" />
              </svg>
              <span className="hidden min-[375px]:inline">Build on This</span>
              <span className="min-[375px]:hidden">Build</span>
            </button>
          </div>
        </div>
      </div>

      {showShare && (
        <SharePopup
          newsId={news.id}
          title={news.title}
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
