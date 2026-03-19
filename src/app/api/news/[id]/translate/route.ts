import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import translate from "google-translate-api-x";

// Devanagari to Roman transliteration — keeps English/ASCII words intact
const DEVANAGARI_MAP: Record<string, string> = {
  // Conjuncts (check before single chars)
  "क्ष": "ksh", "त्र": "tr", "ज्ञ": "gya", "श्र": "shr",
  // Consonants
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
  "ष": "sh", "स": "s", "ह": "h",
  // Independent vowels
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऋ": "ri",
  // Dependent vowel signs (matras)
  "ा": "a", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ृ": "ri",
  // Modifiers
  "ं": "n", "ँ": "n", "ः": "h",
  "्": "", "़": "",
  // Punctuation
  "।": ".", "॥": ".",
  // Numerals
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

function isDevanagari(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0x0900 && code <= 0x097f;
}

function transliterateToken(token: string): string {
  // If token has no Devanagari, return as-is (English word, number, etc.)
  let hasDevanagari = false;
  for (let i = 0; i < token.length; i++) {
    if (isDevanagari(token[i])) { hasDevanagari = true; break; }
  }
  if (!hasDevanagari) return token;

  let result = "";
  let i = 0;
  let lastWasConsonant = false;

  while (i < token.length) {
    // Try 2-char conjuncts first
    if (i + 1 < token.length) {
      const two = token[i] + token[i + 1];
      if (DEVANAGARI_MAP[two] !== undefined) {
        result += DEVANAGARI_MAP[two];
        lastWasConsonant = true;
        i += 2;
        continue;
      }
    }

    const ch = token[i];
    if (DEVANAGARI_MAP[ch] !== undefined) {
      const mapped = DEVANAGARI_MAP[ch];

      // Halant (virama) suppresses inherent 'a'
      if (ch === "्") {
        lastWasConsonant = false;
        i++;
        continue;
      }

      // Vowel sign after consonant — just add the vowel sound
      if ("ािीुूेैोौृ".includes(ch)) {
        result += mapped;
        lastWasConsonant = false;
        i++;
        continue;
      }

      // If this is a consonant and previous was also a consonant without
      // vowel sign, add inherent 'a' for the previous consonant
      if (lastWasConsonant && mapped && "कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह".includes(ch)) {
        result += "a";
      }

      result += mapped;
      // Check if this is a consonant
      lastWasConsonant = "कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह".includes(ch);
    } else if (!isDevanagari(ch)) {
      // Non-Devanagari char (space, punctuation, English)
      if (lastWasConsonant) result += "a";
      lastWasConsonant = false;
      result += ch;
    } else {
      // Unknown Devanagari char
      if (lastWasConsonant) result += "a";
      lastWasConsonant = false;
      result += ch;
    }
    i++;
  }
  // Trailing consonant gets inherent 'a'
  if (lastWasConsonant) result += "a";

  return result;
}

function hindiToHinglish(hindiText: string): string {
  // Split by spaces, transliterate each token independently
  // This preserves English words that Google Translate might keep
  return hindiText
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      return transliterateToken(part);
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
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
    // Step 1: Always get Hindi translation first
    let hindiText = news.summaryHi;
    if (!hindiText) {
      const hiResult = await translate(news.summary, { to: "hi" });
      hindiText = hiResult.text;
      await prisma.news.update({
        where: { id: params.id },
        data: { summaryHi: hindiText },
      });
    }

    if (language === "HI") {
      return NextResponse.json({ text: hindiText });
    }

    // Step 2: For HINGLISH — transliterate Hindi to Roman,
    // preserving any English words Google Translate kept
    const hinglishText = hindiToHinglish(hindiText);

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
