import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ShareSchema = z.object({
  locale: z.enum(["zh", "en"]).optional().default("zh"),
  currency: z.enum(["USD", "CNY", "JPY"]).default("USD"),
  monthlyTotalUsd: z.number().min(0).max(100000),
  yearlyTotalUsd: z.number().min(0).max(1200000),
  savingsUsd: z.number().min(0).max(100000),
  apiSpendUsd: z.number().min(0).max(100000),
  budgetUsd: z.number().min(0).max(100000),
  tierKey: z.string().min(1).max(40),
  topCategory: z.string().min(1).max(80),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        category: z.string().min(1).max(40),
        monthlyUsd: z.number().min(0),
        billingCycle: z.enum(["monthly", "annual"]),
      })
    )
    .max(50),
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

    const slug = generateSlug();
    const record = await prisma.sharedReport.create({
      data: {
        slug,
        locale: parsed.data.locale,
        currency: parsed.data.currency,
        monthlyTotalUsd: parsed.data.monthlyTotalUsd,
        yearlyTotalUsd: parsed.data.yearlyTotalUsd,
        savingsUsd: parsed.data.savingsUsd,
        apiSpendUsd: parsed.data.apiSpendUsd,
        budgetUsd: parsed.data.budgetUsd,
        tierKey: parsed.data.tierKey,
        topCategory: parsed.data.topCategory,
        itemsJson: JSON.stringify(parsed.data.items),
      },
    });

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
      { error: "Database unavailable. Run `npx prisma db push` first." },
      { status: 503 }
    );
  }
}
