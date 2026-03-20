"use client";

import { useState, useEffect, useRef } from "react";
import { trackEvent } from "@/lib/tracker";

interface SharePopupProps {
  newsId: string;
  title: string;
  summary: string;
  onClose: () => void;
}

export default function SharePopup({ newsId, title, summary, onClose }: SharePopupProps) {
  const [copied, setCopied] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/news/${newsId}`
      : `/news/${newsId}`;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleCopy = async () => {
    trackEvent(newsId, "SHARE");
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const summarySnippet100 = summary.length > 100 ? summary.slice(0, 100) + "..." : summary;
  const summarySnippet150 = summary.length > 150 ? summary.slice(0, 150) + "..." : summary;

  // Craft catchy share messages
  const whatsappText = encodeURIComponent(
    `\u{1F525} ${title}\n\n${summarySnippet100}\n\nRead in 60 seconds on Techie Shorts \u{1F447}\n${shareUrl}`
  );
  const telegramText = encodeURIComponent(
    `\u{1F525} ${title}\n\n${summarySnippet100}\n\nRead in 60 seconds on Techie Shorts \u{1F447}`
  );
  const telegramUrl = encodeURIComponent(shareUrl);

  // Twitter: keep under 280 chars
  const twitterBase = ` \u{26A1}\n\n${shareUrl}\n\nvia @TechieShorts`;
  const maxTitleLen = 280 - twitterBase.length - " \u2014 read it in 60 seconds".length;
  const trimmedTitle = title.length > maxTitleLen ? title.slice(0, maxTitleLen - 3) + "..." : title;
  const twitterText = encodeURIComponent(
    `${trimmedTitle} \u2014 read it in 60 seconds${twitterBase}`
  );

  const linkedinText = encodeURIComponent(
    `Worth a quick read for anyone in tech:\n\n${title}\n\n${summarySnippet150}\n\n${shareUrl}`
  );
  const linkedinUrl = encodeURIComponent(shareUrl);

  const emailSubject = encodeURIComponent(`You need to see this: ${title}`);
  const emailBody = encodeURIComponent(
    `Hey,\n\nFound this on Techie Shorts \u2014 takes 60 seconds to read:\n\n${title}\n\n${summarySnippet150}\n\nCheck it out: ${shareUrl}\n\nTechie Shorts \u2014 Dev news in 60 words`
  );

  const options = [
    {
      label: copied ? "Link copied! Share it with your developer friends \u{1F680}" : "Copy Link",
      icon: copied ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      onClick: handleCopy,
      color: copied ? "text-emerald-400" : "text-gray-300",
    },
    {
      label: "WhatsApp",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      href: `https://wa.me/?text=${whatsappText}`,
      color: "text-green-400",
    },
    {
      label: "Telegram",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      href: `https://t.me/share/url?url=${telegramUrl}&text=${telegramText}`,
      color: "text-sky-400",
    },
    {
      label: "X / Twitter",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${twitterText}`,
      color: "text-gray-300",
    },
    {
      label: "LinkedIn",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${linkedinUrl}`,
      color: "text-blue-400",
    },
    {
      label: "Email",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      href: `mailto:?subject=${emailSubject}&body=${emailBody}`,
      color: "text-orange-400",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        ref={popupRef}
        className="mx-4 w-full max-w-xs animate-scale-in rounded-2xl border border-white/10 bg-gray-900/95 p-4 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Share</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-1">
          {options.map((opt) =>
            "href" in opt && opt.href ? (
              <a
                key={opt.label}
                href={opt.href}
                target={opt.href.startsWith("mailto:") ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:bg-white/10 ${opt.color}`}
                onClick={() => { trackEvent(newsId, "SHARE"); onClose(); }}
              >
                {opt.icon}
                {opt.label}
              </a>
            ) : (
              <button
                key={opt.label}
                onClick={opt.onClick}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all hover:bg-white/10 ${opt.color}`}
              >
                {opt.icon}
                <span className="min-w-0 flex-1">{opt.label}</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
