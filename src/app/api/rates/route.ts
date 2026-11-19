import { NextResponse } from "next/server";

export const revalidate = 86400; // 24-hour cache

const FALLBACK_RATES = {
  USD: 1,
  CNY: 7.2,
  JPY: 152,
};

export async function GET() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = (await res.json()) as {
        rates?: Record<string, number>;
        time_last_update_utc?: string;
      };
      const cny = json.rates?.CNY;
      const jpy = json.rates?.JPY;
      if (typeof cny === "number" && cny > 0 && typeof jpy === "number" && jpy > 0) {
        return NextResponse.json({
          source: "live",
          updatedAt: json.time_last_update_utc || new Date().toISOString(),
          rates: {
            USD: 1,
            CNY: Number(cny.toFixed(4)),
            JPY: Number(jpy.toFixed(2)),
          },
        });
      }
    }
  } catch {
    // Graceful fallback when offline
  }

  return NextResponse.json({
    source: "fallback",
    updatedAt: new Date().toISOString(),
    rates: FALLBACK_RATES,
  });
}
