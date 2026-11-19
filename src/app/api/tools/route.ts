import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SEED_DEALS, SEED_TOOLS } from "@/lib/catalog";

export async function GET() {
  try {
    const [tools, deals] = await Promise.all([
      prisma.aiTool.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }),
      prisma.dealItem.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({
      source: tools.length > 0 ? "database" : "seed",
      tools: tools.length > 0 ? tools : SEED_TOOLS,
      deals: deals.length > 0 ? deals : SEED_DEALS,
    });
  } catch {
    return NextResponse.json({
      source: "seed-fallback",
      tools: SEED_TOOLS,
      deals: SEED_DEALS,
    });
  }
}
