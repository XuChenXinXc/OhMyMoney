import { prisma } from "@/lib/prisma";
import { CatalogTool, DealRecord, SEED_DEALS, SEED_TOOLS } from "@/lib/catalog";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

async function loadInitialData(): Promise<{ tools: CatalogTool[]; deals: DealRecord[] }> {
  try {
    const [dbTools, dbDeals] = await Promise.all([
      prisma.aiTool.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }),
      prisma.dealItem.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    // Always include the full up-to-date SEED_TOOLS catalog so newly added models/tiers
    // appear immediately even before re-running `npm run db:seed`, while keeping any extra DB-only items.
    const seedIds = new Set(SEED_TOOLS.map((t) => t.id));
    const extraDbTools: CatalogTool[] = dbTools
      .filter((t) => !seedIds.has(t.id))
      .map((t) => ({
        id: t.id,
        name: t.name,
        nameEn: t.nameEn,
        region: t.region as CatalogTool["region"],
        category: t.category as CatalogTool["category"],
        priceUsd: t.priceUsd,
        annualMonthlyUsd: t.annualMonthlyUsd,
        nativePriceLabel: t.nativePriceLabel,
        noteZh: t.noteZh,
        noteEn: t.noteEn,
        sourceUrl: t.sourceUrl,
      }));

    const tools: CatalogTool[] = [...SEED_TOOLS, ...extraDbTools];

    const deals: DealRecord[] =
      dbDeals.length > 0
        ? dbDeals.map((d) => ({
            id: d.id,
            category: d.category as DealRecord["category"],
            titleZh: d.titleZh,
            titleEn: d.titleEn,
            saveBadgeZh: d.saveBadgeZh,
            saveBadgeEn: d.saveBadgeEn,
            descZh: d.descZh,
            descEn: d.descEn,
            sourceLabel: d.sourceLabel,
            url: d.url,
          }))
        : SEED_DEALS;

    return { tools, deals };
  } catch {
    // Graceful fallback if DB has not been pushed/seeded yet
    return { tools: SEED_TOOLS, deals: SEED_DEALS };
  }
}

export default async function HomePage() {
  const { tools, deals } = await loadInitialData();
  return <AppShell initialTools={tools} initialDeals={deals} />;
}