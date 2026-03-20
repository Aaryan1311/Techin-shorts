import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPersonalizedFeed } from "@/lib/recommendation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tagSlug = searchParams.get("tag");

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id || null;

  try {
    const feed = await getPersonalizedFeed(userId, tagSlug);
    return NextResponse.json(feed);
  } catch (err) {
    console.error("Failed to fetch personalized feed:", err);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}
