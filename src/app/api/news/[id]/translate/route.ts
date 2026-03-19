import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpenAI } from "@/lib/openai";

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

  const news = await prisma.news.findUnique({
    where: { id: params.id },
    select: { summary: true, summaryHi: true, summaryHinglish: true },
  });

  if (!news) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return cached translation if available
  const field = language === "HI" ? "summaryHi" : "summaryHinglish";
  if (news[field]) {
    return NextResponse.json({ text: news[field] });
  }

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 }
    );
  }

  const openai = getOpenAI();

  const systemPrompt =
    language === "HI"
      ? "You are a translator. Translate the following tech news summary into Hindi using देवनागरी script. Keep technical terms (like API, GitHub, JavaScript, etc.) in English. Output only the translation, nothing else."
      : "You are a translator. Translate the following tech news summary into Hinglish — Hindi words written in Roman/English letters, the way young Indian developers text each other. Keep technical terms in English. Example style: 'GitHub ne apna naya Copilot agent mode launch kiya hai jo failing tests detect kar sakta hai'. Output only the translation, nothing else.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: news.summary },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const translated = completion.choices[0]?.message?.content?.trim() || "";

  // Cache in database
  await prisma.news.update({
    where: { id: params.id },
    data: { [field]: translated },
  });

  return NextResponse.json({ text: translated });
}
