"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Lang = "EN" | "HI" | "HINGLISH";

interface AudioPlayerProps {
  text: string;
  newsId: string;
}

const LANG_CONFIG: Record<Lang, { label: string; lang: string; rate: number }> = {
  EN: { label: "EN", lang: "en-US", rate: 1 },
  HI: { label: "HI", lang: "hi-IN", rate: 0.9 },
  HINGLISH: { label: "Hinglish", lang: "hi-IN", rate: 0.95 },
};

const LS_KEY = "techie-shorts-audio-lang";

export default function AudioPlayer({ text, newsId }: AudioPlayerProps) {
  const [lang, setLang] = useState<Lang>("EN");
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const currentNewsRef = useRef(newsId);

  // Load saved preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as Lang | null;
      if (saved && LANG_CONFIG[saved]) setLang(saved);
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Stop speech when card changes / unmounts
  useEffect(() => {
    currentNewsRef.current = newsId;
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [newsId]);

  // Check browser support
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
    }
  }, []);

  const handleLangChange = useCallback(
    (newLang: Lang) => {
      setLang(newLang);
      try {
        localStorage.setItem(LS_KEY, newLang);
      } catch {
        // ignore
      }
      // Save to server for logged-in users (fire and forget)
      fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: newLang }),
      }).catch(() => {});

      // If currently playing, restart with new language
      if (playing) {
        window.speechSynthesis.cancel();
        setTimeout(() => speak(newLang), 50);
      }
    },
    [playing, text] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const speak = useCallback(
    (overrideLang?: Lang) => {
      const synth = window.speechSynthesis;
      synth.cancel();

      const activeLang = overrideLang || lang;
      const config = LANG_CONFIG[activeLang];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = config.lang;
      utterance.rate = config.rate;
      utterance.pitch = 1;

      utterance.onend = () => {
        if (currentNewsRef.current === newsId) setPlaying(false);
      };
      utterance.onerror = () => {
        if (currentNewsRef.current === newsId) setPlaying(false);
      };

      setPlaying(true);
      synth.speak(utterance);
    },
    [lang, text, newsId]
  );

  const togglePlay = useCallback(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    if (playing) {
      synth.cancel();
      setPlaying(false);
    } else {
      speak();
    }
  }, [playing, speak, supported]);

  if (!supported) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 backdrop-blur-sm">
      {/* Speaker icon */}
      <div className="flex shrink-0 items-center">
        <svg
          className={`h-4 w-4 transition-colors ${playing ? "text-indigo-400" : "text-gray-500"}`}
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
      </div>

      {/* Language buttons */}
      <div className="flex gap-1">
        {(Object.keys(LANG_CONFIG) as Lang[]).map((key) => (
          <button
            key={key}
            onClick={() => handleLangChange(key)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-all ${
              lang === key
                ? "bg-indigo-500/20 text-indigo-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {LANG_CONFIG[key].label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-white/10" />

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
          playing
            ? "bg-indigo-500/20 text-indigo-400 shadow-sm shadow-indigo-500/20"
            : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
        }`}
      >
        {playing ? (
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

      {/* Playing indicator */}
      {playing && (
        <div className="flex items-center gap-0.5">
          <span className="inline-block h-2 w-0.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "0ms" }} />
          <span className="inline-block h-3 w-0.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "150ms" }} />
          <span className="inline-block h-2 w-0.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "300ms" }} />
          <span className="inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "450ms" }} />
          <span className="inline-block h-2 w-0.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "600ms" }} />
        </div>
      )}
    </div>
  );
}
