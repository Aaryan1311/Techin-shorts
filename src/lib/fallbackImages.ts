const FALLBACK_IMAGES: Record<string, string> = {
  "ai-ml":
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
  cybersecurity:
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=400&fit=crop",
  cloud:
    "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=400&fit=crop",
  devops:
    "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800&h=400&fit=crop",
  frontend:
    "https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?w=800&h=400&fit=crop",
  backend:
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop",
  python:
    "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&h=400&fit=crop",
  javascript:
    "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800&h=400&fit=crop",
  databases:
    "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&h=400&fit=crop",
  "open-source":
    "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&h=400&fit=crop",
  "career-jobs":
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=400&fit=crop",
  "startups-funding":
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop",
  "gaming-gadgets":
    "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&h=400&fit=crop",
  "design-ux":
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=400&fit=crop",
  "cool-tech":
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop",
  "tech-personalities":
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop",
  "research-papers":
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=400&fit=crop",
  "competitive-programming":
    "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&h=400&fit=crop",
  "indian-tech":
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=400&fit=crop",
  default:
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop",
};

export function getFallbackImage(tags: string[], title: string): string {
  // Try to match by tag slug first
  for (const tag of tags) {
    const slug = tag.toLowerCase().replace(/\s+/g, "-");
    if (FALLBACK_IMAGES[slug]) return FALLBACK_IMAGES[slug];
  }

  // Try keyword matching from title
  const t = title.toLowerCase();
  if (t.includes("ai") || t.includes("artificial intelligence") || t.includes("machine learning") || t.includes("llm") || t.includes("gpt"))
    return FALLBACK_IMAGES["ai-ml"];
  if (t.includes("hack") || t.includes("breach") || t.includes("security") || t.includes("vulnerability"))
    return FALLBACK_IMAGES["cybersecurity"];
  if (t.includes("startup") || t.includes("funding") || t.includes("raised"))
    return FALLBACK_IMAGES["startups-funding"];
  if (t.includes("india") || t.includes("indian"))
    return FALLBACK_IMAGES["indian-tech"];
  if (t.includes("game") || t.includes("gaming") || t.includes("nvidia") || t.includes("gpu"))
    return FALLBACK_IMAGES["gaming-gadgets"];
  if (t.includes("design") || t.includes("figma") || t.includes("ui") || t.includes("ux"))
    return FALLBACK_IMAGES["design-ux"];
  if (t.includes("kubernetes") || t.includes("docker") || t.includes("devops") || t.includes("deploy"))
    return FALLBACK_IMAGES["devops"];
  if (t.includes("cloud") || t.includes("aws") || t.includes("azure") || t.includes("gcp"))
    return FALLBACK_IMAGES["cloud"];
  if (t.includes("react") || t.includes("frontend") || t.includes("css") || t.includes("tailwind"))
    return FALLBACK_IMAGES["frontend"];
  if (t.includes("python") || t.includes("django") || t.includes("flask"))
    return FALLBACK_IMAGES["python"];
  if (t.includes("javascript") || t.includes("typescript") || t.includes("node"))
    return FALLBACK_IMAGES["javascript"];

  return FALLBACK_IMAGES["default"];
}
