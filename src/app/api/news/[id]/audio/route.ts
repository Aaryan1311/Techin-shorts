import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpenAI } from "@/lib/openai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { language } = body;

  const validLangs = ["EN", "HI", "HINGLISH"] as const;
  type ValidLang = (typeof validLangs)[number];

  if (!validLangs.includes(language as ValidLang)) {
    return NextResponse.json(
      { error: "language must be EN, HI, or HINGLISH" },
      { status: 400 }
    );
  }

  const lang = language as ValidLang;

  const news = await prisma.news.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      summary: true,
      summaryHi: true,
      summaryHinglish: true,
      audioUrlEn: true,
      audioUrlHi: true,
      audioUrlHinglish: true,
    },
  });

  if (!news) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Map language to audio URL field
  const audioFieldMap = {
    EN: "audioUrlEn",
    HI: "audioUrlHi",
    HINGLISH: "audioUrlHinglish",
  } as const;
  const audioField = audioFieldMap[lang];

  // Return cached audio if available
  const cachedUrl = news[audioField];
  if (cachedUrl) {
    return NextResponse.json({ audioUrl: cachedUrl });
  }

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 503 }
    );
  }

  // Determine the text to speak
  let textToSpeak: string;
  if (lang === "EN") {
    textToSpeak = news.summary;
  } else if (lang === "HI") {
    if (!news.summaryHi) {
      return NextResponse.json(
        { error: "Hindi translation not available. Call /translate first." },
        { status: 400 }
      );
    }
    textToSpeak = news.summaryHi;
  } else {
    if (!news.summaryHinglish) {
      return NextResponse.json(
        { error: "Hinglish translation not available. Call /translate first." },
        { status: 400 }
      );
    }
    textToSpeak = news.summaryHinglish;
  }

  const openai = getOpenAI();

  // Use different voices for different languages
  const voice = lang === "EN" ? "nova" : "shimmer";

  const mp3Response = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: textToSpeak,
  });

  // Save MP3 to public/audio/
  const audioDir = path.join(process.cwd(), "public", "audio");
  await mkdir(audioDir, { recursive: true });

  const filename = `${news.id}-${lang.toLowerCase()}.mp3`;
  const filepath = path.join(audioDir, filename);
  const buffer = Buffer.from(await mp3Response.arrayBuffer());
  await writeFile(filepath, buffer);

  const audioUrl = `/audio/${filename}`;

  // Cache URL in database
  await prisma.news.update({
    where: { id: params.id },
    data: { [audioField]: audioUrl },
  });

  return NextResponse.json({ audioUrl });
}
