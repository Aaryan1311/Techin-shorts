import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CATEGORY_TAG_MAP: Record<string, string[]> = {
  "AI/ML": ["ai-ml"],
  Security: ["cybersecurity"],
  "DevOps/Cloud": ["devops", "cloud"],
  "Frontend/Backend": ["frontend", "backend", "javascript", "nodejs"],
  "Career/Startup": ["career-jobs"],
};

const FALLBACK_HEADLINES: {
  title: string;
  tags: string[];
  category: string;
}[] = [
  {
    title: "OpenAI Launches GPT-5 with Real-Time Reasoning and 1M Token Context",
    tags: ["ai-ml"],
    category: "AI/ML",
  },
  {
    title: "Critical RCE Vulnerability Found in OpenSSL 3.x — Patch Immediately",
    tags: ["cybersecurity"],
    category: "Security",
  },
  {
    title: "Kubernetes 1.32 Ships with Sidecar Containers GA and In-Place Pod Resizing",
    tags: ["devops", "cloud"],
    category: "DevOps/Cloud",
  },
  {
    title: "React 20 Introduces Server Components as Default with Zero-Bundle Client Mode",
    tags: ["frontend", "javascript"],
    category: "Frontend/Backend",
  },
  {
    title: "Y Combinator W26 Batch: 60% of Startups Are AI-Native Developer Tools",
    tags: ["career-jobs"],
    category: "Career/Startup",
  },
];

export async function GET() {
  try {
    const quizItems: {
      id: string;
      title: string;
      tags: string[];
      category: string;
    }[] = [];

    // Try to find one real article per category
    for (const [category, tagSlugs] of Object.entries(CATEGORY_TAG_MAP)) {
      const article = await prisma.news.findFirst({
        where: {
          isActive: true,
          tags: { some: { tag: { slug: { in: tagSlugs } } } },
        },
        orderBy: { createdAt: "desc" },
        include: {
          tags: { include: { tag: true } },
        },
      });

      if (article) {
        quizItems.push({
          id: article.id,
          title: article.title,
          tags: article.tags.map((nt) => nt.tag.slug),
          category,
        });
      }
    }

    // Fill missing categories with fallback headlines
    const coveredCategories = new Set(quizItems.map((q) => q.category));
    for (const fallback of FALLBACK_HEADLINES) {
      if (!coveredCategories.has(fallback.category)) {
        quizItems.push({
          id: `fallback-${fallback.category}`,
          title: fallback.title,
          tags: fallback.tags,
          category: fallback.category,
        });
      }
    }

    return NextResponse.json(quizItems.slice(0, 5));
  } catch (err) {
    console.error("Failed to generate quiz:", err);
    return NextResponse.json(FALLBACK_HEADLINES, { status: 200 });
  }
}
