import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // --- Tags ---
  const tagsData = [
    { name: "AI / ML", slug: "ai-ml", color: "#8b5cf6" },
    { name: "Python", slug: "python", color: "#3b82f6" },
    { name: "JavaScript", slug: "javascript", color: "#eab308" },
    { name: "Node.js", slug: "nodejs", color: "#22c55e" },
    { name: "Frontend", slug: "frontend", color: "#f97316" },
    { name: "Backend", slug: "backend", color: "#6366f1" },
    { name: "DevOps", slug: "devops", color: "#14b8a6" },
    { name: "Cloud", slug: "cloud", color: "#0ea5e9" },
    { name: "Cybersecurity", slug: "cybersecurity", color: "#ef4444" },
    { name: "Databases", slug: "databases", color: "#a855f7" },
    { name: "Open Source", slug: "open-source", color: "#10b981" },
    { name: "Career & Jobs", slug: "career-jobs", color: "#f59e0b" },
    { name: "Trending", slug: "trending", color: "#ef4444" },
  ];

  const tags: Record<string, { id: string }> = {};
  for (const tag of tagsData) {
    const created = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
    tags[tag.slug] = created;
  }
  console.log(`Created ${Object.keys(tags).length} tags`);

  // --- Sample News ---
  const newsItems = [
    {
      title: "OpenAI Launches GPT-5 with Real-Time Reasoning",
      summary:
        "OpenAI has released GPT-5 featuring real-time chain-of-thought reasoning and a 1M token context window. Benchmarks show a 40% improvement over GPT-4 on coding tasks. The model can now execute multi-step plans, debug entire codebases, and generate production-ready code with fewer hallucinations. Available via API with a new pricing tier for developers.",
      sourceUrl: "https://example.com/gpt5-launch",
      tagSlugs: ["ai-ml", "backend"],
    },
    {
      title: "Node.js 24 Ships with Built-in TypeScript Support",
      summary:
        "Node.js 24 now includes native TypeScript execution without transpilation. The V8 engine update brings 25% faster async operations and a new permissions model for secure module loading. Developers can run .ts files directly using node, eliminating the need for ts-node in most workflows. The release also adds built-in .env file loading.",
      sourceUrl: "https://example.com/nodejs-24",
      tagSlugs: ["nodejs", "javascript", "backend"],
    },
    {
      title: "Tailwind CSS v4 Drops Config Files for CSS-First Setup",
      summary:
        "Tailwind CSS v4 is a ground-up rewrite that replaces JavaScript config with a CSS-first approach. It is up to 10x faster with a new Rust-based engine. Custom themes are now defined directly in CSS using @theme. The new version auto-detects content sources and supports container queries natively. Migration from v3 takes minutes with the upgrade tool.",
      sourceUrl: "https://example.com/tailwind-v4",
      tagSlugs: ["frontend", "javascript", "open-source"],
    },
    {
      title: "AWS Announces Free Tier for Managed PostgreSQL",
      summary:
        "Amazon RDS for PostgreSQL now includes a permanent free tier with 20GB storage and 2 vCPUs. This targets indie developers and startups who need production-grade databases without upfront costs. The free tier includes automated backups, encryption at rest, and read replicas. It supports PostgreSQL 16 with pgvector for AI embedding workloads.",
      sourceUrl: "https://example.com/aws-free-pg",
      tagSlugs: ["cloud", "databases", "devops"],
    },
    {
      title: "Python 3.14 Introduces JIT Compilation",
      summary:
        "Python 3.14 ships an experimental JIT compiler that speeds up CPU-bound workloads by 2-5x. The copy-and-patch JIT works transparently — no code changes needed. Early benchmarks show Django request handling is 30% faster. The GIL-free build also matures, enabling true multi-threaded Python. Data scientists and backend devs stand to benefit the most.",
      sourceUrl: "https://example.com/python-314-jit",
      tagSlugs: ["python", "backend", "ai-ml"],
    },
    {
      title: "GitHub Copilot Now Fixes Its Own Mistakes Automatically",
      summary:
        "GitHub Copilot's new agent mode can detect failing tests, trace the root cause, and submit a fix — all without developer intervention. It runs in a sandboxed environment, creates a PR with the fix, and explains the reasoning. Early adopters report 60% fewer bug-fix cycles. Available for Copilot Enterprise and individual Pro subscribers.",
      sourceUrl: "https://example.com/copilot-agent",
      tagSlugs: ["ai-ml", "open-source", "career-jobs"],
    },
  ];

  for (const item of newsItems) {
    const { tagSlugs, ...newsData } = item;
    const news = await prisma.news.create({
      data: {
        ...newsData,
        tags: {
          create: tagSlugs.map((slug) => ({
            tag: { connect: { slug } },
          })),
        },
      },
    });
    console.log(`Created news: "${news.title}"`);
  }

  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
