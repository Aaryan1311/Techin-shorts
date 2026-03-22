"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import ReactMarkdown from "react-markdown";
import SourceBadge from "@/components/SourceBadge";
import { trackEvent } from "@/lib/tracker";
import { fetcher } from "@/lib/fetcher";

interface NewsDetail {
  id: string;
  title: string;
  summary: string;
  source: string | null;
  futureImpact: string | null;
  buildOnThis: string | null;
  imageUrl: string | null;
  tags: { id: string; name: string; slug: string; color: string }[];
  publishedAt: string;
}

interface ProjectIdea {
  name: string;
  difficulty: string;
  description: string;
}

function cleanText(s: string): string {
  return s.replace(/\*\*/g, "").replace(/\*\[/g, "[").replace(/\]\*/g, "]").trim();
}

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

function parseBuildIdeas(raw: string): ProjectIdea[] {
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
      // Fall through
    }
  }

  const ideas: ProjectIdea[] = [];
  const lines = raw.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();
    const match = cleaned.match(/\*{0,2}([^*[\]]+?)\*{0,2}\s*\[(\w+)\]\s*[—\-–]\s*(.+)/);
    if (match) {
      ideas.push({ name: cleanText(match[1]), difficulty: match[2].trim(), description: cleanText(match[3]) });
      continue;
    }
    const fallback = cleaned.match(/\*{0,2}([^*]+?)\*{0,2}\s*[—\-–]\s*(.+)/);
    if (fallback) {
      ideas.push({ name: cleanText(fallback[1]), difficulty: "Medium", description: cleanText(fallback[2]) });
      continue;
    }
    if (cleaned.length > 10) {
      ideas.push({ name: `Project ${ideas.length + 1}`, difficulty: "Medium", description: cleanText(cleaned) });
    }
  }

  return ideas.sort((a, b) => (DIFFICULTY_ORDER[a.difficulty.toLowerCase()] ?? 1) - (DIFFICULTY_ORDER[b.difficulty.toLowerCase()] ?? 1));
}

function DifficultyBadge({ level }: { level: string }) {
  const n = level.toLowerCase();
  const cfg = n === "easy"
    ? { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" }
    : n === "hard"
      ? { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" }
      : { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {level}
    </span>
  );
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Check if a field has real content (not null, "null", "undefined", empty, etc.) */
function hasValidContent(value: string | null | undefined, minLength = 10): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed === "null" || trimmed === "undefined" || trimmed.length < minLength) return false;
  return true;
}

function extractActionableNote(futureImpact: string | null): string {
  if (!hasValidContent(futureImpact, 10)) return "Stay informed about developments like this to stay ahead in your career.";
  const paragraphs = futureImpact!.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const actionKeywords = /you should|developers need|consider|prepare for|start|learn|adopt|migrate|upgrade|switch|keep an eye|watch for|pay attention/i;
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    if (actionKeywords.test(paragraphs[i])) return paragraphs[i];
  }
  return "Stay informed about developments like this to stay ahead in your career.";
}

export default function WhatsNextPage() {
  const params = useParams();
  const router = useRouter();
  const { data: news, isLoading: loading } = useSWR<NewsDetail>(
    params.id ? `/api/news/${params.id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const enteredAt = useRef(Date.now());
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateFailed, setGenerateFailed] = useState(false);

  useEffect(() => {
    enteredAt.current = Date.now();
    return () => {
      const duration = Math.round((Date.now() - enteredAt.current) / 1000);
      if (params.id && duration > 2) {
        trackEvent(params.id as string, "READ_DETAIL", duration);
      }
    };
  }, [params.id]);

  // Auto-generate advice if futureImpact is missing
  const generateAdvice = useCallback(async (newsId: string) => {
    setGenerating(true);
    setGenerateFailed(false);
    try {
      const res = await fetch(`/api/news/${newsId}/generate-advice`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          setGeneratedContent(data.content);
          return;
        }
      }
      setGenerateFailed(true);
    } catch {
      setGenerateFailed(true);
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    if (news && !hasValidContent(news.futureImpact, 50) && !generatedContent && !generating && !generateFailed) {
      generateAdvice(news.id);
    }
  }, [news, generatedContent, generating, generateFailed, generateAdvice]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 h-4 w-24 animate-pulse rounded bg-gray-800" />
          <div className="mb-4 h-8 w-3/4 animate-pulse rounded bg-gray-800" />
          <div className="mb-8 h-4 w-1/2 animate-pulse rounded bg-gray-800" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-gray-800" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-gray-800" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-gray-800" />
          </div>
        </div>
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

  const hasFutureImpact = hasValidContent(news.futureImpact, 50);
  const hasBuildContent = hasValidContent(news.buildOnThis, 10);
  const ideas = hasBuildContent ? parseBuildIdeas(news.buildOnThis!) : [];
  const showBuildSection = ideas.length > 0;

  // Use existing futureImpact, or generated content, or null
  const displayImpact = hasFutureImpact ? news.futureImpact! : generatedContent;
  const actionableNote = extractActionableNote(displayImpact);

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Feed
        </button>

        {/* Title */}
        <h1 className="mb-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
          {news.title}
        </h1>

        {/* Source + time */}
        <div className="mb-8 flex items-center gap-2">
          <SourceBadge source={news.source} />
          <span className="text-xs text-gray-500">{getTimeAgo(news.publishedAt)}</span>
        </div>

        {/* Section 1 — Industry Impact */}
        <section className="mb-6">
          <div className="border-l-2 border-blue-500 pl-4">
            <h2 className="mb-4 text-lg font-bold text-white">How This Changes the Industry</h2>
          </div>
          {displayImpact ? (
            <article className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-300 prose-headings:text-white prose-strong:text-white prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown>{displayImpact}</ReactMarkdown>
            </article>
          ) : generating ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-gray-900/50 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                Generating analysis...
              </div>
              <div className="h-3 w-full animate-pulse rounded bg-gray-800" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-gray-800" />
              <div className="h-3 w-4/6 animate-pulse rounded bg-gray-800" />
            </div>
          ) : generateFailed ? (
            <div className="rounded-xl border border-white/10 bg-gray-900/50 p-5">
              <p className="mb-3 text-sm text-gray-400">
                Analysis will be available shortly. Meanwhile, read the full article for more context.
              </p>
              <button
                onClick={() => router.push(`/news/${news.id}`)}
                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Read Full Article
              </button>
            </div>
          ) : (
            <p className="text-sm italic text-gray-500">
              Industry impact analysis coming soon.
            </p>
          )}
        </section>

        {/* Section 2 — What This Means for You */}
        <section className="mb-6">
          <div className="border-l-2 border-emerald-500 pl-4">
            <h2 className="mb-4 text-lg font-bold text-white">What This Means for You</h2>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm leading-relaxed text-gray-300">
              {actionableNote}
            </p>
          </div>
        </section>

        {/* Section 3 — Build With This (only if valid content exists) */}
        {showBuildSection && (
          <section className="mb-6">
            <div className="border-l-2 border-purple-500 pl-4">
              <h2 className="mb-4 text-lg font-bold text-white">Project Ideas You Can Build</h2>
            </div>
            <div className="space-y-3">
              {ideas.map((idea, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 transition-all hover:border-purple-500/40"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-xs font-bold text-purple-400">
                      {i + 1}
                    </span>
                    <h3 className="flex-1 text-sm font-bold text-white">{idea.name}</h3>
                    <DifficultyBadge level={idea.difficulty} />
                  </div>
                  <p className="pl-10 text-sm leading-relaxed text-gray-300">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <>{children}</>,
                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      }}
                    >
                      {idea.description}
                    </ReactMarkdown>
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
