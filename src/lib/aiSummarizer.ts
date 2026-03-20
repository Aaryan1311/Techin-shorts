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
          const name = item.name || item.title || "";
          const diff = item.difficulty || item.level || "";
          const desc = item.description || "";
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
5. "buildOnThis" — 3-4 concrete project ideas that developers could build inspired by this news. For each idea, format as: **Project Name** [Difficulty] — Description (1-2 sentences). Difficulty is one of: Easy, Medium, Hard. Format as a numbered markdown list.
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

  // Parse JSON — strip markdown code fences, trim whitespace
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try extracting JSON from first { to last }
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error(`Could not parse AI response for "${title}", skipping`);
      return null;
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      console.error(`JSON still malformed for "${title}", skipping`);
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

  // Validate tags
  const validatedTags = (
    Array.isArray(parsed.tags) ? parsed.tags : []
  ).filter((t: string) => VALID_TAGS.includes(t));

  return {
    summary: ensureString(parsed.summary) || "No summary available.",
    detailContent: ensureString(parsed.detailContent),
    futureImpact: ensureString(parsed.futureImpact),
    buildOnThis: ensureString(parsed.buildOnThis),
    tags: validatedTags.length > 0 ? validatedTags : ["backend"],
    isNews: true,
  };
}
