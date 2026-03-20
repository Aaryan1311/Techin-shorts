import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { coalesce } from "@/lib/requestCoalescer";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — works for EN, HI, Hinglish

const AUDIO_FIELD_MAP = {
  EN: "audioUrlEn",
  HI: "audioUrlHi",
  HINGLISH: "audioUrlHinglish",
} as const;

type ValidLang = keyof typeof AUDIO_FIELD_MAP;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { language } = body;

  const validLangs: ValidLang[] = ["EN", "HI", "HINGLISH"];
  if (!validLangs.includes(language as ValidLang)) {
    return NextResponse.json(
      { error: "language must be EN, HI, or HINGLISH" },
      { status: 400 }
    );
  }

  const lang = language as ValidLang;
  const newsId = params.id;

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "ElevenLabs API key not configured" },
      { status: 503 }
    );
  }

  try {
    const audioUrl = await coalesce(`audio-${newsId}-${lang}`, async () => {
      // Check DB cache first
      const news = await prisma.news.findUnique({
        where: { id: newsId },
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

      if (!news) throw new Error("NOT_FOUND");

      // Return cached audio URL if available
      const audioField = AUDIO_FIELD_MAP[lang];
      const cachedUrl = news[audioField];
      if (cachedUrl) return cachedUrl;

      // Determine text to speak
      let textToSpeak: string;
      if (lang === "EN") {
        textToSpeak = news.summary;
      } else if (lang === "HI") {
        if (!news.summaryHi) throw new Error("TRANSLATION_MISSING");
        textToSpeak = news.summaryHi;
      } else {
        if (!news.summaryHinglish) throw new Error("TRANSLATION_MISSING");
        textToSpeak = news.summaryHinglish;
      }

      // Call ElevenLabs TTS
      const ttsResponse = await fetch(`${ELEVENLABS_BASE}/${VOICE_ID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
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
        throw new Error("AUDIO_GENERATION_FAILED");
      }

      // Save MP3 to public/audio/
      const audioDir = path.join(process.cwd(), "public", "audio");
      await mkdir(audioDir, { recursive: true });

      const filename = `${news.id}-${lang.toLowerCase()}.mp3`;
      const filepath = path.join(audioDir, filename);
      const buffer = Buffer.from(await ttsResponse.arrayBuffer());
      await writeFile(filepath, buffer);

      const url = `/audio/${filename}`;

      // Cache URL in database
      await prisma.news.update({
        where: { id: newsId },
        data: { [audioField]: url },
      });

      return url;
    });

    return NextResponse.json({ audioUrl });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (err.message === "TRANSLATION_MISSING") {
        return NextResponse.json(
          { error: "Translation not available. Call /translate first." },
          { status: 400 }
        );
      }
      if (err.message === "AUDIO_GENERATION_FAILED") {
        return NextResponse.json(
          { error: "Audio generation failed" },
          { status: 502 }
        );
      }
    }
    console.error("Audio error:", err);
    return NextResponse.json(
      { error: "Audio generation failed" },
      { status: 502 }
    );
  }
}
