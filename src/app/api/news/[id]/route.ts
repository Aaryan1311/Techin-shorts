import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const news = await prisma.news.findUnique({
    where: { id: params.id },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!news) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: news.id,
    title: news.title,
    summary: news.summary,
    detailContent: news.detailContent,
    futureImpact: news.futureImpact,
    buildOnThis: news.buildOnThis,
    sourceUrl: news.sourceUrl,
    imageUrl: news.imageUrl,
    likeCount: news.likeCount,
    dislikeCount: news.dislikeCount,
    publishedAt: news.publishedAt,
    createdAt: news.createdAt,
    tags: news.tags.map((nt) => ({
      id: nt.tag.id,
      name: nt.tag.name,
      slug: nt.tag.slug,
      color: nt.tag.color,
    })),
  });
}
