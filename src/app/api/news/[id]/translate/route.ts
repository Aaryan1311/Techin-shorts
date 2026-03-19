import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import translate from "google-translate-api-x";

// Hindi Devanagari to Roman transliteration map
const TRANSLIT_MAP: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "अं": "an", "अः": "ah",
  "ऋ": "ri",
  "क": "ka", "ख": "kha", "ग": "ga", "घ": "gha", "ङ": "nga",
  "च": "cha", "छ": "chha", "ज": "ja", "झ": "jha", "ञ": "nya",
  "ट": "ta", "ठ": "tha", "ड": "da", "ढ": "dha", "ण": "na",
  "त": "ta", "थ": "tha", "द": "da", "ध": "dha", "न": "na",
  "प": "pa", "फ": "pha", "ब": "ba", "भ": "bha", "म": "ma",
  "य": "ya", "र": "ra", "ल": "la", "व": "va", "श": "sha",
  "ष": "sha", "स": "sa", "ह": "ha",
  "क्ष": "ksha", "त्र": "tra", "ज्ञ": "gya",
  "ा": "a", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
  "ं": "n", "ः": "h", "ँ": "n",
  "्": "", "़": "",
  "।": ".", "॥": ".",
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

function transliterateHindiToRoman(hindi: string): string {
  let result = "";
  let i = 0;
  while (i < hindi.length) {
    // Try two-char sequences first (conjuncts, vowel signs)
    if (i + 1 < hindi.length) {
      const twoChar = hindi.substring(i, i + 2);
      if (TRANSLIT_MAP[twoChar] !== undefined) {
        result += TRANSLIT_MAP[twoChar];
        i += 2;
        continue;
      }
    }
    const oneChar = hindi[i];
    if (TRANSLIT_MAP[oneChar] !== undefined) {
      result += TRANSLIT_MAP[oneChar];
    } else {
      result += oneChar; // Keep as-is (English chars, punctuation, spaces)
    }
    i++;
  }
  // Clean up double spaces and trim
  return result.replace(/\s+/g, " ").trim();
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

  try {
    // Step 1: Always translate to Hindi first
    let hindiText = news.summaryHi;
    if (!hindiText) {
      const hiResult = await translate(news.summary, { to: "hi" });
      hindiText = hiResult.text;
      // Cache Hindi translation
      await prisma.news.update({
        where: { id: params.id },
        data: { summaryHi: hindiText },
      });
    }

    if (language === "HI") {
      return NextResponse.json({ text: hindiText });
    }

    // Step 2: For HINGLISH, transliterate Hindi to Roman script
    const hinglishText = transliterateHindiToRoman(hindiText);

    // Cache Hinglish translation
    await prisma.news.update({
      where: { id: params.id },
      data: { summaryHinglish: hinglishText },
    });

    return NextResponse.json({ text: hinglishText });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json(
      { error: "Translation service temporarily unavailable" },
      { status: 503 }
    );
  }
}
