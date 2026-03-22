import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";
import { applyRateLimit } from "@/lib/rateLimit";
import { checkCostGuard } from "@/lib/costGuard";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limit (use translate tier — 20/min)
  const rateLimited = await applyRateLimit(request, "translate");
  if (rateLimited) return rateLimited;

  const newsId = params.id;

  try {
    // Check if article exists and if futureImpact already has content
    const news = await prisma.news.findUnique({
      where: { id: newsId },
      select: {
        title: true,
        summary: true,
        futureImpact: true,
        tags: { include: { tag: true } },
      },
    });

    if (!news) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // If futureImpact already has valid content, return it
    const existing = news.futureImpact;
    if (existing && existing !== "null" && existing !== "undefined" && existing.trim().length >= 50) {
      return NextResponse.json({ content: existing });
    }

    // Check cost guard
    const groqAllowed = await checkCostGuard("groq");
    if (!groqAllowed) {
      return NextResponse.json({
        content: "Analysis for this article is being generated. Check back shortly.",
      });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        content: "Analysis for this article is being generated. Check back shortly.",
      });
    }

    const tagNames = news.tags.map((nt) => nt.tag.name).join(", ");
    const groq = new Groq({ apiKey });

    const prompt = `You are a senior tech career advisor. Based on this news article, write a brief, specific, and actionable analysis for a tech professional.

Article title: ${news.title}
Article summary: ${news.summary}
Tags: ${tagNames}

Write TWO sections in markdown:

## How this changes the industry
Write 100-150 words about the broader industry implications of this news. Be specific to THIS article — don't give generic advice. Reference the actual companies, technologies, or events mentioned. Explain what shifts this signals and who benefits or loses.

## What this means for you
Write 80-120 words of actionable advice for a tech professional. What should they learn, watch out for, or do differently based on this news? Be practical and specific. Don't say "stay informed" — that's useless. Instead say things like "If you use X, check your config for Y" or "This opens up opportunities in Z — consider building skills in..."

Write in simple, clear language. No jargon without explanation. No fluff words like "revolutionary" or "game-changing".`;

    const result = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const content = result.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({
        content: "Analysis for this article is being generated. Check back shortly.",
      });
    }

    // Cache: save to DB so LLM is only called once per article
    await prisma.news.update({
      where: { id: newsId },
      data: { futureImpact: content },
    });

    return NextResponse.json({ content });
  } catch (err) {
    console.error("Generate advice error:", err);
    return NextResponse.json({
      content: "Analysis for this article is being generated. Check back shortly.",
    });
  }
}
