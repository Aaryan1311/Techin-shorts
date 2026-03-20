import Groq from "groq-sdk";

const VALID_TAGS = [
  "ai-ml",
  "python",
  "javascript",
  "nodejs",
  "frontend",
  "backend",
  "devops",
  "cloud",
  "cybersecurity",
  "databases",
  "open-source",
  "career-jobs",
  "trending",
];

interface SummarizedArticle {
  summary: string;
  detailContent: string;
  futureImpact: string;
  buildOnThis: string;
  tags: string[]; // tag slugs
  isNews: boolean;
}

function ensureString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item, i) => {
        if (typeof item === "string") return `${i + 1}. ${item}`;
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          const name = obj.name || obj.title || "";
          const diff = obj.difficulty || obj.level || "";
          const desc = obj.description || "";
          const bracket = diff ? ` [${diff}]` : "";
          return `${i + 1}. **${name}**${bracket} — ${desc}`;
        }
        return `${i + 1}. ${String(item)}`;
      })
      .join("\n");
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value || "");
}

/**
 * Robust JSON parser that handles common LLM output issues:
 * - Strips markdown code fences
 * - Strips text before first { and after last }
 * - Handles trailing commas
 * - Handles unescaped quotes
 * - Handles missing closing braces
 */
function robustParseJSON(text: string): Record<string, unknown> | null {
  // 1. Strip markdown code fences
  let cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // 2. Extract from first { to last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1) return null;

  if (lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  } else {
    // Missing closing brace — add one
    cleaned = cleaned.slice(firstBrace) + "}";
  }

  // 3. Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue with fixes
  }

  // 4. Fix common issues: trailing commas before } or ]
  let fixed = cleaned.replace(/,\s*([}\]])/g, "$1");

  // 5. Try again
  try {
    return JSON.parse(fixed);
  } catch {
    // Continue
  }

  // 6. Try fixing unescaped newlines in strings
  fixed = fixed.replace(/(?<=:\s*"[^"]*)\n/g, "\\n");
  try {
    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

export async function summarizeArticle(
  title: string,
  content: string
): Promise<SummarizedArticle | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const groq = new Groq({ apiKey });

  const prompt = `You are summarizing NEWS for developers. You work for "Techie Shorts", a developer news app that only shows REAL NEWS — product launches, major updates, security vulnerabilities, funding rounds, acquisitions, new releases, breaking changes, and significant announcements.

IMPORTANT: If the article is a tutorial, opinion piece, how-to guide, listicle, or blog post that is NOT actual news, return ONLY: { "isNews": false } and nothing else. We only want real news.

If this IS real news, generate JSON with these fields:

1. "isNews" — true
2. "summary" — A concise 60-80 word summary for the card view. Focus on what happened, why it matters for developers, and key numbers/stats.
3. "detailContent" — A 200-300 word detailed explanation with context, technical details, and implications. Use markdown formatting.
4. "futureImpact" — A 150-200 word analysis of how this could affect the tech industry, developer workflows, or the broader ecosystem in the next 1-3 years. Use markdown formatting.
5. "buildOnThis" — A STRING (not array) with 3 project ideas formatted as: "1. **Project Name** [Difficulty] - Description\\n\\n2. **Project Name** [Difficulty] - Description\\n\\n3. **Project Name** [Difficulty] - Description". Difficulty is one of: Easy, Medium, Hard.
6. "tags" — An array of 1-2 relevant tag slugs from this list: ${VALID_TAGS.join(", ")}. Pick only the MOST relevant 1-2 tags, not 3. Be precise — a Python library release gets "python", not "python" + "backend" + "open-source". If this news has widespread impact across multiple areas of tech (not just one niche), also add the "trending" tag.

Article title: ${title}

Article content (may be truncated):
${content.slice(0, 3000)}

Respond ONLY with valid JSON, no markdown code fences:`;

  let text: string;
  try {
    const result = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });
    text = result.choices[0]?.message?.content || "";
  } catch (err: unknown) {
    const is429 =
      err instanceof Error &&
      (err.message.includes("429") || err.message.includes("rate_limit"));
    if (!is429) throw err;

    console.warn(`Rate limited on "${title}", waiting 60s before retry...`);
    await new Promise((r) => setTimeout(r, 60_000));

    const retry = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });
    text = retry.choices[0]?.message?.content || "";
  }

  // Robust JSON parsing
  let parsed = robustParseJSON(text);

  // If parsing fails, try a stricter retry
  if (!parsed) {
    console.warn(`[aiSummarizer] JSON parse failed for "${title}", retrying with strict prompt...`);
    try {
      const retryResult = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: `Return ONLY valid JSON, nothing else. No markdown, no explanation. Summarize this news article:\n\nTitle: ${title}\n\nReturn: { "isNews": true/false, "summary": "...", "detailContent": "...", "futureImpact": "...", "buildOnThis": "1. **Name** [Difficulty] - Desc", "tags": ["tag1"] }`,
          },
        ],
        temperature: 0.2,
      });
      const retryText = retryResult.choices[0]?.message?.content || "";
      parsed = robustParseJSON(retryText);
    } catch {
      // Fall through
    }

    if (!parsed) {
      console.error(`[aiSummarizer] Could not parse AI response for "${title}" after retry, skipping`);
      return null;
    }
  }

  // Check if AI says this is not news
  if (parsed.isNews === false) {
    return {
      summary: "",
      detailContent: "",
      futureImpact: "",
      buildOnThis: "",
      tags: [],
      isNews: false,
    };
  }

  // Safety: ensure buildOnThis, futureImpact, detailContent are strings
  let buildOnThis: string;
  if (Array.isArray(parsed.buildOnThis)) {
    buildOnThis = (parsed.buildOnThis as Array<{ name?: string; difficulty?: string; description?: string }>)
      .map((idea, i) => `${i + 1}. **${idea.name || "Project"}** [${idea.difficulty || "Medium"}] - ${idea.description || ""}`)
      .join("\n\n");
  } else {
    buildOnThis = ensureString(parsed.buildOnThis);
  }

  const detailContent = ensureString(parsed.detailContent);
  const futureImpact = ensureString(parsed.futureImpact);

  // Validate tags
  const validatedTags = (
    Array.isArray(parsed.tags) ? parsed.tags : []
  ).filter((t: string) => VALID_TAGS.includes(t));

  return {
    summary: ensureString(parsed.summary) || "No summary available.",
    detailContent,
    futureImpact,
    buildOnThis,
    tags: validatedTags.length > 0 ? validatedTags : ["backend"],
    isNews: true,
  };
}
