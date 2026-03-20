"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface NewsDetail {
  id: string;
  title: string;
  summary: string;
  futureImpact: string | null;
  imageUrl: string | null;
  tags: { id: string; name: string; slug: string; color: string }[];
  publishedAt: string;
}

export default function FutureImpactPage() {
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
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

  const content =
    news.futureImpact ||
    `This technology has the potential to reshape how developers work and build software.\n\nA detailed future impact analysis hasn't been generated yet. Check back soon for insights on how this update will influence the tech landscape, job market, and developer workflows.`;

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

        {/* Purple accent icon */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
            <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold uppercase tracking-wider text-purple-400">
            Future Impact
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

        {/* Purple accent bar */}
        <div className="mb-8 h-1 w-16 rounded-full bg-purple-500" />

        {/* Content */}
        <article className="prose-invert mb-10 space-y-4 text-base leading-relaxed text-gray-300">
          {content.split("\n").map((paragraph, i) =>
            paragraph.trim() ? <p key={i}>{paragraph}</p> : null
          )}
        </article>

        {/* Navigation to other pages */}
        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/10 pt-8">
          <button
            onClick={() => router.push(`/news/${news.id}`)}
            className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-400 transition-all hover:bg-indigo-500/20"
          >
            ← Read Detail
          </button>
          <button
            onClick={() => router.push(`/news/${news.id}/build`)}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20"
          >
            Build on This →
          </button>
        </div>
      </div>
    </div>
  );
}
