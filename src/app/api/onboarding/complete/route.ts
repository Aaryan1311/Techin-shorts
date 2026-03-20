import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const VALID_ROLES = new Set<string>([
  "DEVELOPER",
  "QA_TESTER",
  "DESIGNER",
  "PRODUCT_MANAGER",
  "DATA_ANALYST",
  "DEVOPS_ENGINEER",
  "ENGINEERING_MANAGER",
  "FOUNDER",
]);

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  let body: { role?: string; selectedNewsIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { role, selectedNewsIds } = body;

  if (!role || !VALID_ROLES.has(role)) {
    return NextResponse.json(
      { error: "Invalid role" },
      { status: 400 }
    );
  }

  if (!Array.isArray(selectedNewsIds)) {
    return NextResponse.json(
      { error: "selectedNewsIds must be an array" },
      { status: 400 }
    );
  }

  // Save role and mark onboarding complete
  await prisma.user.update({
    where: { id: userId },
    data: {
      role: role as UserRole,
      onboarded: true,
      quizCompletedAt: new Date(),
    },
  });

  // For selected news items, look at their tags and create initial UserTopicScore entries
  const realNewsIds = selectedNewsIds.filter(
    (id) => !id.startsWith("fallback-")
  );

  if (realNewsIds.length > 0) {
    const selectedNews = await prisma.news.findMany({
      where: { id: { in: realNewsIds } },
      include: { tags: { include: { tag: true } } },
    });

    // Collect unique tag slugs from selected articles
    const tagSlugSet = new Set<string>();
    for (const news of selectedNews) {
      for (const nt of news.tags) {
        tagSlugSet.add(nt.tag.slug);
      }
    }

    // Create initial topic scores with 5.0 as starting signal
    for (const tagSlug of Array.from(tagSlugSet)) {
      await prisma.userTopicScore.upsert({
        where: {
          userId_tagSlug: { userId, tagSlug },
        },
        create: {
          userId,
          tagSlug,
          score: 5.0,
        },
        update: {
          score: 5.0,
        },
      });
    }
  }

  // Also handle fallback selections — extract tag slugs directly
  const fallbackIds = selectedNewsIds.filter((id) =>
    id.startsWith("fallback-")
  );
  for (const fid of fallbackIds) {
    // Extract category from fallback ID like "fallback-AI/ML"
    const category = fid.replace("fallback-", "");
    const tagMap: Record<string, string[]> = {
      "AI/ML": ["ai-ml"],
      Security: ["cybersecurity"],
      "DevOps/Cloud": ["devops", "cloud"],
      "Frontend/Backend": ["frontend", "backend"],
      "Career/Startup": ["career-jobs"],
    };
    const slugs = tagMap[category] || [];
    for (const tagSlug of slugs) {
      await prisma.userTopicScore.upsert({
        where: { userId_tagSlug: { userId, tagSlug } },
        create: { userId, tagSlug, score: 5.0 },
        update: { score: 5.0 },
      });
    }
  }

  return NextResponse.json({ success: true });
}
