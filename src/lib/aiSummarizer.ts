import { GoogleGenerativeAI } from "@google/generative-ai";

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

  const result = await model.generateContent(prompt);
  const text = result.response.text();

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
