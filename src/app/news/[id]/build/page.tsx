"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import ReactMarkdown from "react-markdown";
import { trackEvent } from "@/lib/tracker";
import { fetcher } from "@/lib/fetcher";

interface NewsDetail {
  id: string;
  title: string;
  summary: string;
  buildOnThis: string | null;
  futureImpact: string | null;
  imageUrl: string | null;
  tags: { id: string; name: string; slug: string; color: string }[];
  publishedAt: string;
}

interface ProjectIdea {
  name: string;
  difficulty: string;
  description: string;
}

/** Clean markdown artifacts like stray ** or [  */
function cleanText(s: string): string {
  return s.replace(/\*\*/g, "").replace(/\*\[/g, "[").replace(/\]\*/g, "]").trim();
}

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

function parseBuildIdeas(raw: string): ProjectIdea[] {
  // 1. Try JSON parse first
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) {
        return arr
          .map((item: { name?: string; difficulty?: string; description?: string }) => ({
            name: cleanText(item.name || "Project"),
            difficulty: item.difficulty || "Medium",
            description: cleanText(item.description || ""),
          }))
          .sort((a, b) => (DIFFICULTY_ORDER[a.difficulty.toLowerCase()] ?? 1) - (DIFFICULTY_ORDER[b.difficulty.toLowerCase()] ?? 1));
      }
    } catch {
      // Fall through to string parsing
    }
  }

  // 2. Parse numbered markdown items
  const ideas: ProjectIdea[] = [];
  const lines = raw.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();

    // Match: **Name** [Difficulty] — Description
    const match = cleaned.match(
      /\*{0,2}([^*[\]]+?)\*{0,2}\s*\[(\w+)\]\s*[—\-–]\s*(.+)/
    );
    if (match) {
      ideas.push({
        name: cleanText(match[1]),
        difficulty: match[2].trim(),
        description: cleanText(match[3]),
      });
      continue;
    }

    // Fallback: **Name** — Description (no difficulty)
    const fallback = cleaned.match(
      /\*{0,2}([^*]+?)\*{0,2}\s*[—\-–]\s*(.+)/
    );
    if (fallback) {
      ideas.push({
        name: cleanText(fallback[1]),
        difficulty: "Medium",
        description: cleanText(fallback[2]),
      });
      continue;
    }

    // Last resort: use the line as description
    if (cleaned.length > 10) {
      ideas.push({
        name: `Project ${ideas.length + 1}`,
        difficulty: "Medium",
        description: cleanText(cleaned),
      });
    }
  }

  return ideas.sort(
    (a, b) => (DIFFICULTY_ORDER[a.difficulty.toLowerCase()] ?? 1) - (DIFFICULTY_ORDER[b.difficulty.toLowerCase()] ?? 1)
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const normalized = level.toLowerCase();
  const config =
    normalized === "easy"
      ? { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" }
      : normalized === "hard"
        ? { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" }
        : { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.text} ${config.border}`}
    >
      {level}
    </span>
  );
}

export default function BuildOnThisPage() {
  const params = useParams();
  const router = useRouter();
  const { data: news, isLoading: loading } = useSWR<NewsDetail>(
    params.id ? `/api/news/${params.id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const enteredAt = useRef(Date.now());

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

  const ideas = news.buildOnThis ? parseBuildIdeas(news.buildOnThis) : [];
  const hasBuildIdeas = ideas.length > 0;

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
              loading="lazy"
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

        {hasBuildIdeas ? (
          <>
            <p className="mb-6 text-base text-gray-400">
              Inspired by this news? Here are project ideas you can start building today.
            </p>

            <div className="mb-10 space-y-4">
              {ideas.map((idea, i) => (
                <div
                  key={i}
                  className="group rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-5 transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-sm font-bold text-emerald-400">
                      {i + 1}
                    </span>
                    <h3 className="flex-1 text-base font-bold text-white">
                      {idea.name}
                    </h3>
                    <DifficultyBadge level={idea.difficulty} />
                  </div>
                  <p className="pl-11 text-sm leading-relaxed text-gray-300">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <>{children}</>,
                        strong: ({ children }) => (
                          <strong className="font-semibold text-white">{children}</strong>
                        ),
                      }}
                    >
                      {idea.description}
                    </ReactMarkdown>
                  </p>
                  <div className="mt-3 pl-11">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100">
                      Start Building
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="mb-6 text-base text-gray-400">
              This article doesn&apos;t have specific build ideas, but here&apos;s what it means for you:
            </p>

            {news.futureImpact ? (
              <article className="prose prose-invert mb-10 max-w-none text-base leading-relaxed text-gray-300 prose-headings:text-white prose-strong:text-white prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline">
                <ReactMarkdown>{news.futureImpact}</ReactMarkdown>
              </article>
            ) : (
              <p className="mb-10 text-sm italic text-gray-500">
                Build ideas and impact analysis for this article are coming soon.
              </p>
            )}
          </>
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
