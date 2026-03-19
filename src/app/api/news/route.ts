import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tagSlug = searchParams.get("tag");

  const where: Record<string, unknown> = { isActive: true };

  if (tagSlug) {
    where.tags = {
      some: {
        tag: { slug: tagSlug },
      },
    };
  }

  const news = await prisma.news.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  const result = news.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    sourceUrl: item.sourceUrl,
    imageUrl: item.imageUrl,
    likeCount: item.likeCount,
    dislikeCount: item.dislikeCount,
    viewCount: item.viewCount,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    tags: item.tags.map((nt) => ({
      id: nt.tag.id,
      name: nt.tag.name,
      slug: nt.tag.slug,
      color: nt.tag.color,
    })),
  }));

  return NextResponse.json(result);
}
