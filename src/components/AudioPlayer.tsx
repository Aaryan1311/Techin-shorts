"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { globalAudio } from "@/lib/globalAudio";

export type Lang = "EN" | "HI" | "HINGLISH";

interface AudioPlayerProps {
  newsId: string;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  cachedAudioUrls?: { EN: string | null; HI: string | null; HINGLISH: string | null };
}

const LANG_LABELS: Record<Lang, string> = {
  EN: "EN",
  HI: "HI",
  HINGLISH: "Hinglish",
};

export default function AudioPlayer({ newsId, lang, onLangChange, cachedAudioUrls }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable stop callback for this player instance
  const stopCallback = useCallback(() => {
    setPlaying(false);
  }, []);

  // Stop audio when card scrolls out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio < 0.5) {
            globalAudio.stopIfOwner(stopCallback);
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [stopCallback]);

  // Stop audio when card changes / unmounts
  useEffect(() => {
    return () => {
      globalAudio.stopIfOwner(stopCallback);
    };
  }, [newsId, stopCallback]);

  useEffect(() => {
    setError(null);
  }, [newsId]);

  const handleLangSwitch = useCallback(
    (newLang: Lang) => {
      globalAudio.stopIfOwner(stopCallback);
      setError(null);
      onLangChange(newLang);
    },
    [onLangChange, stopCallback]
  );

  const togglePlay = async () => {
    if (playing) {
      globalAudio.stopIfOwner(stopCallback);
      return;
    }

    setError(null);

    try {
      // Step 1: Translate if needed
      if (lang !== "EN") {
        setLoadingStep("Translating...");
        const translateRes = await fetch(`/api/news/${newsId}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: lang }),
        });
        if (!translateRes.ok) {
          const data = await translateRes.json();
          throw new Error(data.error || "Translation failed");
        }
      }

      // Step 2: Get audio — use cached URL if available
      const cachedUrl = cachedAudioUrls?.[lang] || null;
      let audioUrl: string;

      if (cachedUrl) {
        audioUrl = cachedUrl;
      } else {
        setLoadingStep("Generating audio...");
        const audioRes = await fetch(`/api/news/${newsId}/audio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: lang }),
        });

        if (!audioRes.ok) {
          const data = await audioRes.json();
          throw new Error(data.error || "Audio generation failed");
        }

        const audioData = await audioRes.json();
        audioUrl = audioData.audioUrl;
      }

      // Step 3: Play via global audio manager (stops any other playing audio)
      const audio = globalAudio.play(audioUrl, stopCallback);
      audio.onended = () => setPlaying(false);
      audio.onerror = () => {
        setPlaying(false);
        setError("Playback failed");
      };

      await audio.play();
      setPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingStep(null);
    }
  };

  const isLoading = !!loadingStep;

  return (
    <div ref={containerRef}>
      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 backdrop-blur-sm">
        {/* Speaker icon */}
        <svg
          className={`h-4 w-4 shrink-0 transition-colors ${playing ? "text-indigo-400" : "text-gray-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.788v6.424a.5.5 0 00.757.429l4.964-3.212a.5.5 0 000-.858L7.257 8.36a.5.5 0 00-.757.429z"
          />
        </svg>

        {/* Language buttons */}
        <div className="flex gap-1">
          {(["EN", "HI", "HINGLISH"] as Lang[]).map((key) => (
            <button
              key={key}
              onClick={() => handleLangSwitch(key)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-all ${
                lang === key
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {LANG_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-white/10" />

        {/* Play/Pause/Loading */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
            isLoading
              ? "bg-white/5 text-gray-500"
              : playing
                ? "bg-indigo-500/20 text-indigo-400 shadow-sm shadow-indigo-500/20"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
          }`}
        >
          {isLoading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-500 border-t-indigo-400" />
          ) : playing ? (
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z" />
            </svg>
          )}
        </button>

        {/* Equalizer animation */}
        {playing && (
          <div className="flex items-center gap-0.5">
            <span className="inline-block h-2 w-0.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "0ms" }} />
            <span className="inline-block h-3 w-0.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "150ms" }} />
            <span className="inline-block h-2 w-0.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "300ms" }} />
            <span className="inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "450ms" }} />
            <span className="inline-block h-2 w-0.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "600ms" }} />
          </div>
        )}

        {/* Loading step label */}
        {loadingStep && (
          <span className="text-[10px] text-gray-500">{loadingStep}</span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 px-1 text-[11px] text-red-400/80">{error}</p>
      )}
    </div>
  );
}
