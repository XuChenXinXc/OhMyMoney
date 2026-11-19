import { PrismaClient } from "@prisma/client";
import { SEED_TOOLS, SEED_DEALS } from "../src/lib/catalog";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ohmymoney.money database...");

  for (const tool of SEED_TOOLS) {
    await prisma.aiTool.upsert({
      where: { id: tool.id },
      update: tool,
      create: tool,
    });
  }

  for (const deal of SEED_DEALS) {
    await prisma.dealItem.upsert({
      where: { id: deal.id },
      update: deal,
      create: deal,
    });
  }

  console.log(`Seeded ${SEED_TOOLS.length} AI tools and ${SEED_DEALS.length} verified deals.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
