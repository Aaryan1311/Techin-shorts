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

const LS_KEY = "techie-shorts-audio-lang";

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
  const [likeAnim, setLikeAnim] = useState(false);
  const [dislikeAnim, setDislikeAnim] = useState(false);
  const [showShare, setShowShare] = useState(false);

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

    // Trigger animation
    if (isLike) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 400);
    } else {
      setDislikeAnim(true);
      setTimeout(() => setDislikeAnim(false), 400);
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
        // User cancelled — do nothing
      }
      return; // Always return when native share is available — never show custom popup
    }

    setShowShare(true);
  };

  const displaySummary =
    lang === "EN" ? news.summary : translatedText || news.summary;

  const timeAgo = getTimeAgo(news.publishedAt || news.createdAt);

  return (
    <>
      <div className="flex h-full w-full items-center justify-center px-4 py-4">
        <div className="relative flex h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">
          {/* Background image overlay */}
          {news.imageUrl && (
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.15]"
              style={{ backgroundImage: `url(${news.imageUrl})` }}
              onError={() => {}}
            />
          )}
          {news.imageUrl && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90" />
          )}

          {/* Top gradient accent */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

          <div className="relative flex flex-1 flex-col px-5 pt-4 pb-5">
            {/* Top row: source, time, share */}
            <div className="mb-2 flex items-center gap-2">
              <SourceBadge source={news.source} />
              <span className="ml-auto text-[11px] text-gray-500">{timeAgo}</span>
              <button
                onClick={handleShare}
                className="rounded-lg p-1.5 text-gray-500 transition-all hover:bg-white/10 hover:text-white"
                aria-label="Share"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>

            {/* Tags — compact */}
            <div className="mb-2 flex flex-wrap gap-1.5">
              {news.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full px-2 py-px text-[10px] font-semibold"
                  style={{
                    backgroundColor: `${tag.color}18`,
                    color: tag.color,
                    border: `1px solid ${tag.color}30`,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>

            {/* Title */}
            <h2 className="mb-2 text-lg font-bold leading-snug text-white sm:text-xl">
              {news.title}
            </h2>

            {/* Summary — centered in remaining space */}
            <div className="relative flex flex-1 items-center">
              <p
                className={`text-sm leading-relaxed text-gray-300 transition-opacity duration-200 sm:text-base ${
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

            {/* Audio player */}
            <AudioPlayer
              newsId={news.id}
              lang={lang}
              onLangChange={handleLangChange}
            />

            {/* Action buttons with hover effects */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => router.push(`/news/${news.id}`)}
                className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2.5 text-xs font-semibold text-indigo-400 transition-all hover:scale-[1.03] hover:bg-indigo-500/20 hover:shadow-md hover:shadow-indigo-500/10 active:scale-[0.97] sm:text-sm"
              >
                Read Detail
              </button>
              <button
                onClick={() => router.push(`/news/${news.id}/future`)}
                className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2.5 text-xs font-semibold text-purple-400 transition-all hover:scale-[1.03] hover:bg-purple-500/20 hover:shadow-md hover:shadow-purple-500/10 active:scale-[0.97] sm:text-sm"
              >
                Future Impact
              </button>
              <button
                onClick={() => router.push(`/news/${news.id}/build`)}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-400 transition-all hover:scale-[1.03] hover:bg-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/10 active:scale-[0.97] sm:text-sm"
              >
                Build on This
              </button>
            </div>

            {/* Bottom row: source + reactions */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <a
                href={news.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-300"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Source
              </a>

              {/* Like / Dislike with animation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleInteract("LIKE")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                    likeAnim ? "animate-vote-pulse" : ""
                  } ${
                    voted === "like"
                      ? "bg-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-500/20"
                      : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                  }`}
                >
                  <svg
                    className={`h-4 w-4 transition-transform ${likeAnim ? "scale-125" : ""}`}
                    fill={voted === "like" ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                  </svg>
                  {likes > 0 && <span className="font-medium">{likes}</span>}
                </button>
                <button
                  onClick={() => handleInteract("DISLIKE")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                    dislikeAnim ? "animate-vote-pulse" : ""
                  } ${
                    voted === "dislike"
                      ? "bg-red-500/20 text-red-400 shadow-sm shadow-red-500/20"
                      : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                  }`}
                >
                  <svg
                    className={`h-4 w-4 transition-transform ${dislikeAnim ? "scale-125" : ""}`}
                    fill={voted === "dislike" ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
                  </svg>
                  {dislikes > 0 && <span className="font-medium">{dislikes}</span>}
                </button>
              </div>
            </div>
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
