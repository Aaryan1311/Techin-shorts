/**
 * Reset all existing users to re-onboard with the new role + quiz flow.
 * Sets onboarded = false and role = null for every user.
 *
 * Usage: npx tsx scripts/reset-users-onboarding.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: {
      onboarded: false,
      role: null,
    },
  });

  console.log(`Reset ${result.count} users to onboarded=false, role=null`);
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
