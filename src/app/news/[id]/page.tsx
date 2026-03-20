"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { trackEvent } from "@/lib/tracker";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface NewsDetail {
  id: string;
  title: string;
  summary: string;
  detailContent: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  tags: Tag[];
  publishedAt: string;
}

export default function ReadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const enteredAt = useRef(Date.now());

  useEffect(() => {
    fetch(`/api/news/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setNews(data);
        setLoading(false);
      });
  }, [params.id]);

  // Track READ_DETAIL duration on unmount
  useEffect(() => {
    enteredAt.current = Date.now();
    return () => {
      const duration = Math.round((Date.now() - enteredAt.current) / 1000);
      if (params.id && duration > 2) {
        trackEvent(params.id as string, "READ_DETAIL", duration);
      }
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
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
    news.detailContent ||
    `${news.summary}\n\nDetailed content has not been generated yet. Check back soon for an in-depth breakdown of this story.`;

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

        {/* Date */}
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

        {/* Accent bar */}
        <div className="mb-8 h-1 w-16 rounded-full bg-indigo-500" />

        {/* Content */}
        <article className="prose prose-invert mb-10 max-w-none text-base leading-relaxed text-gray-300 prose-headings:text-white prose-strong:text-white prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>

        {/* Source link */}
        {news.sourceUrl && (
          <a
            href={news.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-10 inline-flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-400 transition-all hover:bg-indigo-500/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Read original source
          </a>
        )}

        {/* Navigation to other pages */}
        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/10 pt-8">
          <button
            onClick={() => router.push(`/news/${news.id}/future`)}
            className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm font-semibold text-purple-400 transition-all hover:bg-purple-500/20"
          >
            Future Impact →
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
