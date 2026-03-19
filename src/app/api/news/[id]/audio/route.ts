import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — works for EN, HI, Hinglish

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
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "ElevenLabs API key not configured" },
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

  // Call ElevenLabs TTS
  const ttsResponse = await fetch(`${ELEVENLABS_BASE}/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: textToSpeak,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!ttsResponse.ok) {
    const errText = await ttsResponse.text();
    console.error("ElevenLabs error:", ttsResponse.status, errText);
    return NextResponse.json(
      { error: "Audio generation failed" },
      { status: 502 }
    );
  }

  // Save MP3 to public/audio/
  const audioDir = path.join(process.cwd(), "public", "audio");
  await mkdir(audioDir, { recursive: true });

  const filename = `${news.id}-${lang.toLowerCase()}.mp3`;
  const filepath = path.join(audioDir, filename);
  const buffer = Buffer.from(await ttsResponse.arrayBuffer());
  await writeFile(filepath, buffer);

  const audioUrl = `/audio/${filename}`;

  // Cache URL in database
  await prisma.news.update({
    where: { id: params.id },
    data: { [audioField]: audioUrl },
  });

  return NextResponse.json({ audioUrl });
}
