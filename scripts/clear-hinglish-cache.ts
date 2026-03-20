/**
 * Clear all cached Hinglish translations so they regenerate
 * using the new Groq-based Hinglish translation approach.
 *
 * Usage: npx tsx scripts/clear-hinglish-cache.ts
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await prisma.news.updateMany({
      where: { summaryHinglish: { not: null } },
      data: { summaryHinglish: null },
    });

    console.log(`Cleared ${result.count} cached Hinglish translations.`);
    console.log("They will regenerate using Groq on next request.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
