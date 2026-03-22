"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import ReactMarkdown from "react-markdown";
import { trackEvent } from "@/lib/tracker";
import { fetcher } from "@/lib/fetcher";

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
  const { data: news, isLoading: loading } = useSWR<NewsDetail>(
    params.id ? `/api/news/${params.id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const enteredAt = useRef(Date.now());

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
    "Detailed article coming soon. Check back shortly for an in-depth breakdown of this story.";

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

        {/* Navigation to What's Next */}
        <div className="mt-8 border-t border-white/10 pt-8">
          <button
            onClick={() => { trackEvent(news.id, "CLICK_FUTURE"); router.push(`/news/${news.id}/whats-next`); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm font-semibold text-purple-400 transition-all hover:bg-purple-500/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
            What&apos;s Next →
          </button>
        </div>
      </div>
    </div>
  );
}
