import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import translate from "google-translate-api-x";
import Groq from "groq-sdk";
import { coalesce } from "@/lib/requestCoalescer";

/**
 * Translate English text to natural Hinglish using Groq LLM.
 * Technical terms, proper nouns, numbers, and commonly used English words
 * stay in English — only conversational connectors switch to Hindi (Roman script).
 */
async function translateToHinglish(englishText: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const groq = new Groq({ apiKey });

  const prompt = `Convert this English tech news summary to Hinglish — the way Indian software developers actually talk to each other in casual conversation.

CRITICAL RULES:
- Keep ALL technical terms in English (API, server, deploy, production, framework, bug, database, cloud, AI, ML, model, pipeline, endpoint, cache, etc.)
- Keep ALL commonly used English words in English (demo, fail, issue, result, system, process, report, available, update, launch, release, version, feature, company, user, data, team, etc.)
- Keep ALL proper nouns in English (GitHub, Google, AWS, Python, React, etc.)
- Keep ALL numbers and percentages in English (60%, v2.0, 1000+, etc.)
- ONLY convert the conversational connecting words to Hindi written in Roman/Latin script
- It should sound natural — like a message in a developer WhatsApp group
- Do NOT use Devanagari script — everything must be in Roman/Latin letters
- Return ONLY the converted text, nothing else. No quotes, no explanation, no preamble.

Example input: "GitHub Copilot's new agent mode can detect failing tests, trace the root cause, and submit a fix — all without developer intervention."
Example output: "GitHub Copilot ka naya agent mode failing tests detect kar sakta hai, root cause trace kar sakta hai, aur fix submit kar sakta hai — sab kuch bina developer ke intervention ke."

Now convert this text:
${englishText}`;

  // Rate-limit: 3s delay before calling
  await new Promise((r) => setTimeout(r, 3000));

  try {
    const result = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    const output = result.choices[0]?.message?.content?.trim();
    if (!output) throw new Error("Empty response from Groq");
    return output;
  } catch (err: unknown) {
    const is429 =
      err instanceof Error &&
      (err.message.includes("429") || err.message.includes("rate_limit"));
    if (!is429) throw err;

    console.warn("Groq rate limited for Hinglish translation, waiting 60s...");
    await new Promise((r) => setTimeout(r, 60_000));

    const retry = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    const output = retry.choices[0]?.message?.content?.trim();
    if (!output) throw new Error("Empty response from Groq after retry");
    return output;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { language } = body;

  if (language !== "HI" && language !== "HINGLISH") {
    return NextResponse.json(
      { error: "language must be HI or HINGLISH" },
      { status: 400 }
    );
  }

  const newsId = params.id;

  try {
    const text = await coalesce(`translate-${newsId}-${language}`, async () => {
      // Check DB cache first
      const news = await prisma.news.findUnique({
        where: { id: newsId },
        select: { summary: true, summaryHi: true, summaryHinglish: true },
      });

      if (!news) throw new Error("NOT_FOUND");

      // Return cached if available
      if (language === "HI" && news.summaryHi) return news.summaryHi;
      if (language === "HINGLISH" && news.summaryHinglish) return news.summaryHinglish;

      // Generate translation
      if (language === "HI") {
        const hiResult = await translate(news.summary, { to: "hi" });
        const hindiText = hiResult.text;
        await prisma.news.update({
          where: { id: newsId },
          data: { summaryHi: hindiText },
        });
        return hindiText;
      }

      // HINGLISH — Groq LLM
      const hinglishText = await translateToHinglish(news.summary);
      await prisma.news.update({
        where: { id: newsId },
        data: { summaryHinglish: hinglishText },
      });
      return hinglishText;
    });

    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Translation error:", err);
    return NextResponse.json(
      { error: "Translation service temporarily unavailable" },
      { status: 503 }
    );
  }
}
