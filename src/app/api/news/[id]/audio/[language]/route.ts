import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AUDIO_DATA_FIELD = {
  en: "audioDataEn",
  hi: "audioDataHi",
  hinglish: "audioDataHinglish",
} as const;

type ValidLang = keyof typeof AUDIO_DATA_FIELD;

export async function GET(
  _request: Request,
  { params }: { params: { id: string; language: string } }
) {
  const lang = params.language.toLowerCase() as ValidLang;

  if (!AUDIO_DATA_FIELD[lang]) {
    return NextResponse.json(
      { error: "Invalid language. Use: en, hi, or hinglish" },
      { status: 400 }
    );
  }

  const dataField = AUDIO_DATA_FIELD[lang];

  const news = await prisma.news.findUnique({
    where: { id: params.id },
    select: { audioDataEn: true, audioDataHi: true, audioDataHinglish: true },
  });

  if (!news) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const base64Data = news[dataField] as string | null;

  if (!base64Data) {
    return NextResponse.json(
      { error: "Audio not generated yet" },
      { status: 404 }
    );
  }

  const mp3Buffer = Buffer.from(base64Data, "base64");

  return new NextResponse(mp3Buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(mp3Buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
