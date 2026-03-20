import type { Lang } from "@/components/AudioPlayer";

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  source: string | null;
  imageUrl: string | null;
  likeCount: number;
  dislikeCount: number;
  viewCount: number;
  publishedAt: string;
  createdAt: string;
  tags: Tag[];
  userInteraction?: string | null;
  summaryHi?: string | null;
  summaryHinglish?: string | null;
  audioUrlEn?: string | null;
  audioUrlHi?: string | null;
  audioUrlHinglish?: string | null;
  isTrending?: boolean;
}

export async function fetchTags(): Promise<Tag[]> {
  const res = await fetch("/api/tags");
  return res.json();
}

export async function fetchNews(params?: {
  tag?: string | null;
  feed?: "all" | "personal";
}): Promise<NewsItem[]> {
  const qs = new URLSearchParams();
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.feed === "personal") qs.set("feed", "personal");
  const query = qs.toString();
  const res = await fetch(`/api/news${query ? `?${query}` : ""}`);
  return res.json();
}

export async function interactWithNews(
  newsId: string,
  type: "LIKE" | "DISLIKE"
): Promise<{
  likeCount: number;
  dislikeCount: number;
  userInteraction: string | null;
}> {
  const res = await fetch(`/api/news/${newsId}/interact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  return res.json();
}

export async function translateNews(
  newsId: string,
  language: Lang
): Promise<{ text: string } | null> {
  const res = await fetch(`/api/news/${newsId}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAdminNews(secret: string): Promise<{
  ok: boolean;
  processed?: number;
  error?: string;
}> {
  const res = await fetch("/api/admin/fetch-news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret }),
  });
  const data = await res.json();
  if (res.ok) return { ok: true, processed: data.processed };
  return { ok: false, error: data.error || "Failed to fetch news" };
}

export function saveLanguagePreference(lang: Lang): void {
  fetch("/api/user/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferredLanguage: lang }),
  }).catch(() => {});
}
