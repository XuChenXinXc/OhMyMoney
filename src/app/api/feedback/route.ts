import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const FeedbackSchema = z.object({
  toolName: z.string().trim().min(1).max(120),
  note: z.string().trim().min(3).max(1000),
  sourceUrl: z.string().trim().url().optional().or(z.literal("")),
  locale: z.enum(["zh", "en"]).optional().default("zh"),
});

export async function GET() {
  try {
    const items = await prisma.priceFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = FeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid feedback payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = await prisma.priceFeedback.create({
      data: {
        toolName: parsed.data.toolName,
        note: parsed.data.note,
        sourceUrl: parsed.data.sourceUrl || null,
        locale: parsed.data.locale,
      },
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/feedback error:", err);
    return NextResponse.json(
      { error: "Database unavailable. Run `npx prisma db push` to enable persistence." },
      { status: 503 }
    );
  }
}
