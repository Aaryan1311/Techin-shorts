"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setTags);
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
      setError("Please select at least 3 topics");
      return;
    }

    setError("");
    setLoading(true);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds: Array.from(selected) }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    // Update the session to reflect onboarded status
    await update({ onboarded: true });
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Greeting */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">
            Welcome{session?.user?.name ? `, ${session.user.name}` : ""}!
          </h1>
          <p className="text-gray-400">
            Pick the topics you care about. We&apos;ll personalize your feed.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Select at least 3 topics
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Tag grid */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tags.map((tag) => {
            const isSelected = selected.has(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggle(tag.id)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                  isSelected
                    ? "shadow-lg"
                    : "border-white/10 bg-gray-900 text-gray-400 hover:border-white/20 hover:bg-gray-800"
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: `${tag.color}20`,
                        borderColor: `${tag.color}60`,
                        color: tag.color,
                        boxShadow: `0 4px 14px ${tag.color}20`,
                      }
                    : undefined
                }
              >
                {tag.name}
              </button>
            );
          })}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || selected.size < 3}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 disabled:opacity-40"
        >
          {loading
            ? "Saving..."
            : `Continue with ${selected.size} topic${selected.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
