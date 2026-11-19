import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ShareSchema = z.object({
  locale: z.enum(["zh", "en"]).optional().default("zh"),
  currency: z.enum(["USD", "CNY", "JPY"]).optional().default("USD"),
  monthlyTotalUsd: z.number().finite().min(0).max(100000),
  yearlyTotalUsd: z.number().finite().min(0).max(1200000),
  savingsUsd: z.number().finite().min(0).max(100000),
  apiSpendUsd: z.number().finite().min(0).max(100000),
  budgetUsd: z.number().finite().min(0).max(100000),
  tierKey: z.string().max(40).optional().default("minimalist"),
  topCategory: z.string().max(120).optional().default("None"),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        category: z.string().min(1).max(40),
        monthlyUsd: z.number().finite().min(0),
        billingCycle: z.enum(["monthly", "annual"]),
      })
    )
    .max(50)
    .default([]),
});

function generateSlug(): string {
  return crypto.randomBytes(4).toString("base64url").slice(0, 6);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ShareSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid share snapshot", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const baseData = {
      currency: parsed.data.currency,
      monthlyTotalUsd: parsed.data.monthlyTotalUsd,
      yearlyTotalUsd: parsed.data.yearlyTotalUsd,
      savingsUsd: parsed.data.savingsUsd,
      apiSpendUsd: parsed.data.apiSpendUsd,
      budgetUsd: parsed.data.budgetUsd,
      tierKey: parsed.data.tierKey || "minimalist",
      topCategory: parsed.data.topCategory || "None",
      itemsJson: JSON.stringify(parsed.data.items),
    };

    let record: { slug: string } | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = generateSlug();
      try {
        record = await prisma.sharedReport.create({
          data: {
            slug,
            locale: parsed.data.locale,
            ...baseData,
          },
          select: { slug: true },
        });
        break;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);

        // Case A: Local SQLite DB exists but hasn't been migrated with the new `locale` column yet
        if (msg.includes("does not exist") || msg.includes("no such column") || msg.includes("no column")) {
          try {
            await prisma.$executeRawUnsafe(
              `ALTER TABLE "SharedReport" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'zh'`
            );
          } catch {
            // Column may already exist or DB is non-SQLite; proceed to retry
          }
          try {
            record = await prisma.sharedReport.create({
              data: { slug, locale: parsed.data.locale, ...baseData },
              select: { slug: true },
            });
            break;
          } catch (retryErr) {
            lastError = retryErr;
          }
        }

        // Case B: Older generated Prisma Client doesn't recognize `locale` argument
        if (msg.includes("Unknown argument") || msg.includes("locale")) {
          try {
            record = await prisma.sharedReport.create({
              data: { slug, ...baseData },
              select: { slug: true },
            });
            break;
          } catch (fallbackErr) {
            lastError = fallbackErr;
          }
        }

        // Retry only on unique slug collision
        if (!msg.toLowerCase().includes("unique")) {
          break;
        }
      }
    }

    if (!record) {
      console.error("POST /api/shares failed:", lastError);
      const detail = lastError instanceof Error ? lastError.message : "Database error";
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "development"
              ? `生成短链失败 (${detail.slice(0, 120)})，请先运行 npx prisma db push`
              : "Database unavailable. Run `npx prisma db push` first.",
        },
        { status: 503 }
      );
    }

    const isLocal =
      req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";
    const baseUrl = isLocal
      ? req.nextUrl.origin
      : process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

    return NextResponse.json(
      {
        ok: true,
        slug: record.slug,
        url: `${baseUrl}/s/${record.slug}`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/shares error:", err);
    return NextResponse.json(
      { error: "Failed to parse request or connect to database." },
      { status: 500 }
    );
  }
}
