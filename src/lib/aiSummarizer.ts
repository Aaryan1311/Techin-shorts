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
];

interface SummarizedArticle {
  summary: string;
  detailContent: string;
  futureImpact: string;
  buildOnThis: string;
  tags: string[]; // tag slugs
}

export async function summarizeArticle(
  title: string,
  content: string
): Promise<SummarizedArticle> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const groq = new Groq({ apiKey });

  const prompt = `You are a tech news summarizer for a developer-focused app called "Techie Shorts". Given the article title and content below, generate JSON with these fields:

1. "summary" — A concise 60-80 word summary for the card view. Focus on what happened, why it matters for developers, and key numbers/stats.
2. "detailContent" — A 200-300 word detailed explanation with context, technical details, and implications. Use markdown formatting.
3. "futureImpact" — A 150-200 word analysis of how this could affect the tech industry, developer workflows, or the broader ecosystem in the next 1-3 years. Use markdown formatting.
4. "buildOnThis" — 3-4 concrete project ideas (with difficulty level) that developers could build inspired by this news. Format as a numbered markdown list with project name in bold, difficulty in brackets, and a 1-2 sentence description.
5. "tags" — An array of 1-3 relevant tag slugs from this list: ${VALID_TAGS.join(", ")}

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

  // Parse JSON — strip any accidental code fences
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);

  // Validate tags
  const validatedTags = (parsed.tags || []).filter((t: string) =>
    VALID_TAGS.includes(t)
  );

  return {
    summary: parsed.summary || "No summary available.",
    detailContent: parsed.detailContent || "",
    futureImpact: parsed.futureImpact || "",
    buildOnThis: parsed.buildOnThis || "",
    tags: validatedTags.length > 0 ? validatedTags : ["backend"],
  };
}
