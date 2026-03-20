import Groq from "groq-sdk";

// ── Shared constants ──

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

function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");
  return new Groq({ apiKey });
}

/**
 * Robust JSON parser that handles common LLM output issues:
 * - Strips markdown code fences
 * - Strips text before first { and after last }
 * - Handles trailing commas
 * - Handles missing closing braces
 */
function robustParseJSON(text: string): Record<string, unknown> | null {
  let cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1) return null;

  if (lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  } else {
    cleaned = cleaned.slice(firstBrace) + "}";
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fix trailing commas
    const fixed = cleaned.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(fixed);
    } catch {
      // Fix unescaped newlines in strings
      const fixed2 = fixed.replace(/(?<=:\s*"[^"]*)\n/g, "\\n");
      try {
        return JSON.parse(fixed2);
      } catch {
        return null;
      }
    }
  }
}

async function callGroq(
  groq: Groq,
  prompt: string,
  title: string
): Promise<string> {
  try {
    const result = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    return result.choices[0]?.message?.content || "";
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
      temperature: 0.3,
    });
    return retry.choices[0]?.message?.content || "";
  }
}

// ── Stage 1: Classification & Rating ──

export interface ClassificationResult {
  isNews: boolean;
  category: string;
  qualityScore: number;
  trendingScore: number;
  relevanceForDevs: number;
  reasoning: string;
  suggestedTags: string[];
  isTrending: boolean;
  roleRelevance: Record<string, number>;
}

export async function classifyArticle(
  title: string,
  description: string,
  sourceUrl: string,
  source: string
): Promise<ClassificationResult | null> {
  const groq = getGroq();

  const prompt = `You are a senior tech news editor for a developer-focused news app called Techie Shorts. Your job is to evaluate whether an article deserves to be shown to busy software developers.

This is for a tech professional news app. ONLY tech news qualifies. Political news, general business, space, automotive (unless self-driving/AI related), and celebrity news are NOT relevant even if they mention a tech company. Jeff Bezos buying companies is NOT tech news unless it's directly about AWS/tech. Focus on: software releases, AI model launches, developer tool updates, security vulnerabilities, open source projects, cloud platform changes, programming language updates, startup funding IN TECH, acquisitions IN TECH.

EVALUATE the article on these criteria and return a JSON response:

{
  "isNews": true/false,
  "category": "product_launch" | "major_update" | "security_vulnerability" | "funding_acquisition" | "new_release" | "breaking_change" | "industry_trend" | "research_paper" | "opinion" | "tutorial" | "blog_post" | "discussion",
  "qualityScore": 1-10,
  "trendingScore": 1-10,
  "relevanceForDevs": 1-10,
  "reasoning": "one line explaining your rating",
  "suggestedTags": ["tag1", "tag2"],
  "isTrending": true/false,
  "roleRelevance": { "developer": 0.0-1.0, "pm": 0.0-1.0, "qa": 0.0-1.0, "devops": 0.0-1.0, "designer": 0.0-1.0, "data_analyst": 0.0-1.0 }
}

RULES FOR SCORING:
- isNews = true ONLY for: product launches, major version releases, security vulnerabilities, acquisitions, funding rounds, breaking API changes, new tools/frameworks, significant open source releases, major company announcements
- isNews = false for: tutorials, how-to guides, opinion pieces, "10 best practices" listicles, personal blog posts, beginner guides, job postings, memes
- qualityScore: 8-10 = must-read for any developer, 5-7 = interesting for some developers, 1-4 = low quality or irrelevant
- trendingScore: 8-10 = everyone in tech is talking about this, 5-7 = notable within a niche, 1-4 = not trending
- relevanceForDevs: 8-10 = directly impacts how developers work, 5-7 = good to know, 1-4 = barely relevant to developers
- isTrending: true only if trendingScore >= 8 AND qualityScore >= 7

TAG RULES:
- Pick ONLY 1-2 most relevant tags from this list: ${VALID_TAGS.filter((t) => t !== "trending").join(", ")}
- Be precise: a Python library release = ["python", "open-source"], NOT ["python", "backend", "open-source", "ai-ml"]
- Never pick more than 2 tags

QUALITY FILTERS:
- If the title contains "How to", "Tutorial", "Guide", "Best Practices", "Tips", "Tricks", "Introduction to", "Getting Started" → isNews = false
- If from Reddit and it's a self-post discussion/question → isNews = false
- If from Dev.to and it's clearly a blog post → isNews = false
- GitHub repos are news ONLY if they're significant (trending, 1000+ stars, from a major company)

Article title: ${title}
Source: ${source} (${sourceUrl})
Description: ${description.slice(0, 1500)}

Respond ONLY with valid JSON, no markdown code fences:`;

  const text = await callGroq(groq, prompt, title);
  let parsed = robustParseJSON(text);

  // Retry with strict prompt if parsing fails
  if (!parsed) {
    console.warn(`[Stage 1] JSON parse failed for "${title}", retrying with strict prompt...`);
    const retryText = await callGroq(
      groq,
      `Return ONLY valid JSON. Classify this tech article: "${title}" from ${source}. Return: { "isNews": true/false, "category": "...", "qualityScore": 1-10, "trendingScore": 1-10, "relevanceForDevs": 1-10, "reasoning": "...", "suggestedTags": [], "isTrending": false, "roleRelevance": {} }`,
      title
    );
    parsed = robustParseJSON(retryText);

    if (!parsed) {
      console.error(`[Stage 1] Could not parse classification for "${title}" after retry`);
      return null;
    }
  }

  const suggestedTags = (
    Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : []
  ).filter((t: string) => VALID_TAGS.includes(t) && t !== "trending");

  // Parse roleRelevance safely
  const rawRoleRelevance =
    typeof parsed.roleRelevance === "object" && parsed.roleRelevance !== null
      ? (parsed.roleRelevance as Record<string, unknown>)
      : {};
  const roleRelevance: Record<string, number> = {};
  for (const [key, val] of Object.entries(rawRoleRelevance)) {
    roleRelevance[key] = typeof val === "number" ? val : 0;
  }

  return {
    isNews: parsed.isNews === true,
    category: String(parsed.category || "unknown"),
    qualityScore: Number(parsed.qualityScore) || 0,
    trendingScore: Number(parsed.trendingScore) || 0,
    relevanceForDevs: Number(parsed.relevanceForDevs) || 0,
    reasoning: String(parsed.reasoning || ""),
    suggestedTags: suggestedTags.slice(0, 2),
    isTrending: parsed.isTrending === true,
    roleRelevance,
  };
}

// ── Stage 2: Summarization ──

export interface SummarizedArticle {
  summary: string;
  detailContent: string;
  futureImpact: string;
  buildOnThis: string;
  tags: string[];
}

export async function summarizeArticle(
  title: string,
  content: string,
  classification: ClassificationResult
): Promise<SummarizedArticle | null> {
  const groq = getGroq();

  const tagList = classification.suggestedTags.join(", ");

  const prompt = `You are writing for Techie Shorts — a news app for developers who want quick, no-BS tech updates.

Write a summary in EXACTLY 60-80 words. Rules:
- Lead with WHAT happened, not background context
- Include specific numbers, versions, or names when available
- No fluff words like "exciting", "revolutionary", "game-changing"
- Write like a senior engineer briefing their team, not like a marketing blog
- Be factual and precise

Also generate:
- "detailContent" (200-300 words): deeper explanation with technical details, who's affected, and what changed specifically. Use markdown formatting.
- "futureImpact" (150-200 words): concrete predictions — what should developers prepare for? What skills become more/less valuable? What products/tools might emerge? Be specific, not vague. Use markdown formatting.
- "buildIdeas" (a JSON array of exactly 3 objects): each with "name" (string, the project name), "difficulty" (string: "Easy", "Medium", or "Hard"), and "description" (string, 2-3 sentences explaining the project). These should be CONCRETE project ideas a developer could start this weekend.
- "tags": use these tags from the classification stage: [${tagList}]

Return a JSON object with keys: summary, detailContent, futureImpact, buildIdeas, tags

Article title: ${title}
Article content (may be truncated):
${content.slice(0, 3000)}

Respond ONLY with valid JSON, no markdown code fences:`;

  const text = await callGroq(groq, prompt, title);
  let parsed = robustParseJSON(text);

  // Retry with strict prompt if parsing fails
  if (!parsed) {
    console.warn(`[Stage 2] JSON parse failed for "${title}", retrying...`);
    const retryText = await callGroq(
      groq,
      `Return ONLY valid JSON. Summarize this tech article: "${title}". Return: { "summary": "60-80 words", "detailContent": "200-300 words", "futureImpact": "150-200 words", "buildIdeas": [{"name":"...", "difficulty":"Easy|Medium|Hard", "description":"..."}], "tags": [${tagList ? `"${tagList}"` : ""}] }`,
      title
    );
    parsed = robustParseJSON(retryText);

    if (!parsed) {
      console.error(`[Stage 2] Could not parse summary for "${title}" after retry`);
      return null;
    }
  }

  // Convert buildIdeas array → formatted string
  let buildOnThis: string;
  const rawIdeas = parsed.buildIdeas || parsed.buildOnThis;
  if (Array.isArray(rawIdeas)) {
    buildOnThis = rawIdeas
      .map(
        (idea: { name?: string; difficulty?: string; description?: string }, i: number) =>
          `${i + 1}. **${idea.name || "Project"}** [${idea.difficulty || "Medium"}] - ${idea.description || ""}`
      )
      .join("\n\n");
  } else {
    buildOnThis = ensureString(rawIdeas);
  }

  // Safety: ensure detailContent and futureImpact are strings
  const detailContent = ensureString(parsed.detailContent);
  const futureImpact = ensureString(parsed.futureImpact);

  // Use tags from classification, validated
  const tags = classification.suggestedTags.filter((t) =>
    VALID_TAGS.includes(t)
  );
  if (classification.isTrending && !tags.includes("trending")) {
    tags.push("trending");
  }

  return {
    summary: ensureString(parsed.summary) || "No summary available.",
    detailContent,
    futureImpact,
    buildOnThis,
    tags: tags.length > 0 ? tags : ["backend"],
  };
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
      .join("\n\n");
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value || "");
}
