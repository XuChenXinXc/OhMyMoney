import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DealRecord, SEED_DEALS } from "@/lib/catalog";

export const dynamic = "force-dynamic";

interface HnHit {
  objectID: string;
  title?: string;
  url?: string;
  created_at?: string;
}

const BRAND_KEYWORDS = [
  "openai",
  "chatgpt",
  "claude",
  "anthropic",
  "gemini",
  "cursor",
  "copilot",
  "perplexity",
  "deepseek",
  "midjourney",
  "kimi",
];

const PRICE_KEYWORDS = [
  "price",
  "pricing",
  "free",
  "discount",
  "plan",
  "student",
  "tier",
  "cost",
  "api",
  "annual",
];

const RSS_FEEDS: { name: string; url: string; category: DealRecord["category"] }[] = [
  { name: "GitHub Changelog", url: "https://github.blog/changelog/label/copilot/feed/", category: "alternative" },
  { name: "OpenAI News", url: "https://openai.com/news/rss.xml", category: "alternative" },
];

function matchesAiPricing(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    BRAND_KEYWORDS.some((k) => lower.includes(k)) &&
    PRICE_KEYWORDS.some((k) => lower.includes(k))
  );
}

function parseRssItems(xml: string, sourceName: string, category: DealRecord["category"]): DealRecord[] {
  const items: DealRecord[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 3) {
    const block = match[1];
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const pubMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const title = titleMatch?.[1]?.trim();
    const link = linkMatch?.[1]?.trim();
    if (!title || !link || !matchesAiPricing(title)) continue;

    const dateStr = pubMatch?.[1]
      ? new Date(pubMatch[1]).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const slugHash = Buffer.from(link).toString("base64url").slice(0, 10);
    items.push({
      id: `rss-${slugHash}`,
      category,
      titleZh: `[官方动态] ${title}`,
      titleEn: `[Official] ${title}`,
      saveBadgeZh: `最新 ${dateStr}`,
      saveBadgeEn: `New ${dateStr}`,
      descZh: `来自 ${sourceName} 官方 RSS 的最新 AI 定价与套餐变更通知，点击查看原文。`,
      descEn: `Latest AI pricing & plan update from ${sourceName} official RSS feed.`,
      sourceLabel: sourceName,
      url: link,
    });
  }
  return items;
}

async function runSync(): Promise<NextResponse> {
  const syncedAt = new Date().toISOString();
  const liveDeals: DealRecord[] = [];
  const seenUrls = new Set<string>();

  // 1. Fetch Hacker News Algolia AI pricing/deal stories
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      "https://hn.algolia.com/api/v1/search_by_date?query=AI%20pricing%20OR%20Claude%20OR%20ChatGPT%20OR%20Cursor%20OR%20DeepSeek&tags=story&hitsPerPage=20",
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);

    if (res.ok) {
      const json = (await res.json()) as { hits?: HnHit[] };
      const hits = (json.hits || []).filter(
        (h) => h.title && h.url && matchesAiPricing(h.title)
      );
      for (const hit of hits.slice(0, 3)) {
        const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);
        const dateStr = hit.created_at ? hit.created_at.slice(0, 10) : syncedAt.slice(0, 10);
        liveDeals.push({
          id: `hn-${hit.objectID}`,
          category: "alternative",
          titleZh: `[实时情报] ${hit.title}`,
          titleEn: `[Live] ${hit.title}`,
          saveBadgeZh: `最新 ${dateStr}`,
          saveBadgeEn: `New ${dateStr}`,
          descZh: "来自 Hacker News 实时抓取的 AI 工具定价与订阅动态，点击下方链接查看原文。",
          descEn: "Live AI pricing & subscription news fetched from Hacker News.",
          sourceLabel: "Hacker News",
          url,
        });
      }
    }
  } catch {
    // Graceful fallback
  }

  // 2. Fetch Official RSS Feeds in parallel
  await Promise.all(
    RSS_FEEDS.map(async (feed) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        const res = await fetch(feed.url, { signal: controller.signal, cache: "no-store" });
        clearTimeout(timer);
        if (!res.ok) return;
        const xml = await res.text();
        for (const item of parseRssItems(xml, feed.name, feed.category)) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            liveDeals.push(item);
          }
        }
      } catch {
        // Ignore single feed failure
      }
    })
  );

  // 3. Upsert into DB
  for (const deal of liveDeals) {
    try {
      await prisma.dealItem.upsert({
        where: { id: deal.id },
        update: {
          titleZh: deal.titleZh,
          titleEn: deal.titleEn,
          saveBadgeZh: deal.saveBadgeZh,
          saveBadgeEn: deal.saveBadgeEn,
          url: deal.url,
        },
        create: deal,
      });
    } catch {
      // Ignore if DB not initialized
    }
  }

  let allDeals: DealRecord[] = [...liveDeals, ...SEED_DEALS];
  try {
    const dbDeals = await prisma.dealItem.findMany({ orderBy: { createdAt: "desc" } });
    if (dbDeals.length > 0) {
      allDeals = dbDeals.map((d) => ({
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
      }));
    }
  } catch {
    // Fallback to in-memory merged list
  }

  return NextResponse.json({
    ok: true,
    syncedAt,
    fetchedCount: liveDeals.length,
    deals: allDeals,
  });
}

// Manual trigger from UI (POST)
export async function POST() {
  return runSync();
}

// Scheduled Vercel Cron trigger (GET) — protected by CRON_SECRET if configured
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return runSync();
}
