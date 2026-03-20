"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface NewsDetail {
  id: string;
  title: string;
  summary: string;
  buildOnThis: string | null;
  imageUrl: string | null;
  tags: { id: string; name: string; slug: string; color: string }[];
  publishedAt: string;
}

export default function BuildOnThisPage() {
  const params = useParams();
  const router = useRouter();
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/news/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setNews(data);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-gray-400">News not found.</p>
      </div>
    );
  }

  const defaultIdeas = [
    "Build a CLI tool that leverages this technology to automate developer workflows",
    "Create a web dashboard that visualizes the key metrics and data from this update",
    "Develop a browser extension that integrates this feature into your daily browsing",
    "Write an open-source library that wraps this functionality for easier adoption",
    "Build a tutorial platform that teaches developers how to use this technology hands-on",
  ];

  const hasContent = !!news.buildOnThis;
  const contentLines = hasContent
    ? news.buildOnThis!.split("\n").filter((l) => l.trim())
    : [];

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          className="mb-8 flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to feed
        </button>

        {/* Emerald accent icon */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <span className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
            Build on This
          </span>
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
        <h1 className="mb-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
          {news.title}
        </h1>

        <p className="mb-8 text-sm text-gray-500">
          {new Date(news.publishedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        {/* Hero image */}
        {news.imageUrl && (
          <div className="mb-8 overflow-hidden rounded-xl">
            <img
              src={news.imageUrl}
              alt={news.title}
              className="w-full object-cover"
              style={{ maxHeight: "320px" }}
              onError={(e) => {
                (e.target as HTMLImageElement).parentElement!.style.display = "none";
              }}
            />
          </div>
        )}

        {/* Emerald accent bar */}
        <div className="mb-8 h-1 w-16 rounded-full bg-emerald-500" />

        {/* Project ideas as cards */}
        <div className="mb-10 space-y-4">
          {hasContent
            ? contentLines.map((line, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-gray-300">
                      {line.replace(/^\d+[\.\)]\s*/, "")}
                    </p>
                  </div>
                </div>
              ))
            : defaultIdeas.map((idea, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-gray-300">{idea}</p>
                  </div>
                </div>
              ))}
        </div>

        {!hasContent && (
          <p className="mb-10 text-sm italic text-gray-500">
            Custom build ideas for this article haven&apos;t been generated yet.
            These are starter prompts to get you building.
          </p>
        )}

        {/* Navigation to other pages */}
        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/10 pt-8">
          <button
            onClick={() => router.push(`/news/${news.id}`)}
            className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-400 transition-all hover:bg-indigo-500/20"
          >
            ← Read Detail
          </button>
          <button
            onClick={() => router.push(`/news/${news.id}/future`)}
            className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm font-semibold text-purple-400 transition-all hover:bg-purple-500/20"
          >
            ← Future Impact
          </button>
        </div>
      </div>
    </div>
  );
}
