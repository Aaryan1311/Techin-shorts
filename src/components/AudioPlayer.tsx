"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Lang = "EN" | "HI" | "HINGLISH";

interface AudioPlayerProps {
  text: string;
  newsId: string;
}

const LANG_LABELS: Record<Lang, string> = {
  EN: "EN",
  HI: "HI",
  HINGLISH: "Hinglish",
};

const LS_KEY = "techie-shorts-audio-lang";

export default function AudioPlayer({ text, newsId }: AudioPlayerProps) {
  const [lang, setLang] = useState<Lang>("EN");
  const [playing, setPlaying] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as Lang | null;
      if (saved && LANG_LABELS[saved]) setLang(saved);
    } catch {
      // ignore
    }
  }, []);

  // Stop audio when card changes / unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [newsId]);

  // Reset translated text when switching news
  useEffect(() => {
    setTranslatedText(null);
    setError(null);
  }, [newsId]);

  const handleLangChange = useCallback(
    (newLang: Lang) => {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        setPlaying(false);
      }

      setLang(newLang);
      setTranslatedText(null);
      setError(null);

      try {
        localStorage.setItem(LS_KEY, newLang);
      } catch {
        // ignore
      }

      // Save preference (fire and forget)
      fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: newLang }),
      }).catch(() => {});

      // Fetch translation for non-EN
      if (newLang !== "EN") {
        fetchTranslation(newLang);
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const fetchTranslation = async (targetLang: Lang) => {
    try {
      const res = await fetch(`/api/news/${newsId}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: targetLang }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranslatedText(data.text);
      }
    } catch {
      // Translation display is optional
    }
  };

  const togglePlay = async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
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
        const translateData = await translateRes.json();
        setTranslatedText(translateData.text);
      }

      // Step 2: Get audio
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

      // Step 3: Play
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      audio.src = audioData.audioUrl;

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
  const displayText = lang === "EN" ? null : translatedText;

  return (
    <div className="mb-4 space-y-2">
      {/* Controls bar */}
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
              onClick={() => handleLangChange(key)}
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
        <p className="px-1 text-[11px] text-red-400/80">{error}</p>
      )}

      {/* Translated text display */}
      {displayText && (
        <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
          <p className="text-xs leading-relaxed text-gray-400">
            {displayText}
          </p>
        </div>
      )}
    </div>
  );
}
