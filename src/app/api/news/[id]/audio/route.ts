import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { coalesce } from "@/lib/requestCoalescer";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — works for EN, HI, Hinglish

const AUDIO_URL_FIELD = {
  EN: "audioUrlEn",
  HI: "audioUrlHi",
  HINGLISH: "audioUrlHinglish",
} as const;

const AUDIO_DATA_FIELD = {
  EN: "audioDataEn",
  HI: "audioDataHi",
  HINGLISH: "audioDataHinglish",
} as const;

type ValidLang = keyof typeof AUDIO_URL_FIELD;

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
    const result = await coalesce(`audio-${newsId}-${lang}`, async () => {
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
          audioDataEn: true,
          audioDataHi: true,
          audioDataHinglish: true,
        },
      });

      if (!news) throw new Error("NOT_FOUND");

      // Return cached if available
      const urlField = AUDIO_URL_FIELD[lang];
      const dataField = AUDIO_DATA_FIELD[lang];
      if (news[urlField] === "db:cached" && news[dataField]) {
        return { cached: true, base64: news[dataField] as string };
      }

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

      const buffer = Buffer.from(await ttsResponse.arrayBuffer());
      const base64 = buffer.toString("base64");

      // Save base64 in DB, set URL to "db:cached"
      await prisma.news.update({
        where: { id: newsId },
        data: {
          [urlField]: "db:cached",
          [dataField]: base64,
        },
      });

      return { cached: false, base64 };
    });

    // Return the audio as binary MP3
    const mp3Buffer = Buffer.from(result.base64, "base64");
    return new NextResponse(mp3Buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(mp3Buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
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
