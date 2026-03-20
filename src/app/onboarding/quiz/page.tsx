"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface QuizItem {
  id: string;
  title: string;
  tags: string[];
  category: string;
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      }
    >
      <QuizContent />
    </Suspense>
  );
}

function QuizContent() {
  const searchParams = useSearchParams();
  const { update } = useSession();
  const role = searchParams.get("role") || "DEVELOPER";

  const [items, setItems] = useState<QuizItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/onboarding/quiz")
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size < 3) {
      setError("Pick at least 3 headlines");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          selectedNewsIds: Array.from(selected),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setSubmitting(false);
        return;
      }

      await update({ onboarded: true });
      window.location.href = "/";
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const CATEGORY_COLORS: Record<string, string> = {
    "AI/ML": "#8b5cf6",
    Security: "#ef4444",
    "DevOps/Cloud": "#3b82f6",
    "Frontend/Backend": "#f59e0b",
    "Career/Startup": "#10b981",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">
            Pick headlines that interest you
          </h1>
          <p className="text-gray-400">
            Select at least 3 stories to personalize your feed
          </p>
          <p className="mt-1 text-sm text-gray-500">Step 2 of 2</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-white/5 bg-gray-900"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Quiz items */}
            <div className="mb-8 space-y-3">
              {items.map((item) => {
                const isSelected = selected.has(item.id);
                const color = CATEGORY_COLORS[item.category] || "#6366f1";
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                      isSelected
                        ? "shadow-lg"
                        : "border-white/10 bg-gray-900 hover:border-white/20 hover:bg-gray-800"
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${color}15`,
                            borderColor: `${color}50`,
                            boxShadow: `0 4px 14px ${color}15`,
                          }
                        : undefined
                    }
                  >
                    <div className="mb-1 flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                          isSelected
                            ? "border-transparent"
                            : "border-white/20 bg-transparent"
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: color }
                            : undefined
                        }
                      >
                        {isSelected && (
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold leading-snug ${isSelected ? "text-white" : "text-gray-300"}`}>
                          {item.title}
                        </p>
                        <span
                          className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${color}20`,
                            color,
                          }}
                        >
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || selected.size < 3}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 disabled:opacity-40"
            >
              {submitting
                ? "Setting up your feed..."
                : `Start reading (${selected.size} selected)`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
