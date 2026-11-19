import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CurrencyCode, formatMoney } from "@/lib/catalog";
import { Locale, TIER_COPY } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface SharedItem {
  name: string;
  category: string;
  monthlyUsd: number;
  billingCycle: string;
}

export default async function SharedReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  let report = null;
  try {
    report = await prisma.sharedReport.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    notFound();
  }

  if (!report) notFound();

  const locale: Locale =
    query.lang === "en" || query.lang === "zh"
      ? query.lang
      : report.locale === "en"
        ? "en"
        : "zh";
  const isZh = locale === "zh";

  const currency = (["USD", "CNY", "JPY"].includes(report.currency)
    ? report.currency
    : "USD") as CurrencyCode;
  const tier = TIER_COPY[locale][report.tierKey] ?? TIER_COPY[locale].minimalist;

  let items: SharedItem[] = [];
  try {
    items = JSON.parse(report.itemsJson);
  } catch {
    items = [];
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center bg-[#FFF8E7] px-4 py-12 text-black">
      <div className="brutal-card overflow-hidden bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-display text-sm font-extrabold tracking-tight"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-black bg-[#FFE500] font-mono text-sm font-black">
              $
            </span>
            <span>OhMyMoney</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/s/${slug}?lang=${isZh ? "en" : "zh"}`}
              className="rounded-lg border-2 border-black bg-[#FFF8E7] px-2.5 py-1 text-[11px] font-extrabold hover:bg-[#FFE500]"
            >
              {isZh ? "English" : "中文"}
            </Link>
            <span className="rounded-lg border-2 border-black bg-[#00E599] px-3 py-1 text-xs font-extrabold">
              {tier.badge}
            </span>
          </div>
        </div>

        <h1 className="mt-5 font-display text-3xl font-extrabold">
          {isZh ? "AI 订阅体检分享账单" : "Shared AI Subscription Receipt"}
        </h1>
        <p className="mt-1.5 text-sm font-medium text-zinc-700">{tier.roast}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border-2 border-black bg-[#FFE500] p-4">
            <p className="text-xs font-bold">{isZh ? "月均总支出" : "Monthly Total"}</p>
            <p className="mt-1 font-mono text-2xl font-extrabold">
              {formatMoney(report.monthlyTotalUsd, currency)}
            </p>
          </div>
          <div className="rounded-xl border-2 border-black bg-[#00E599] p-4">
            <p className="text-xs font-bold">{isZh ? "年化预估" : "Annualized"}</p>
            <p className="mt-1 font-mono text-2xl font-extrabold">
              {formatMoney(report.yearlyTotalUsd, currency)}
            </p>
          </div>
          <div className="col-span-2 rounded-xl border-2 border-black bg-[#FF5C5C] p-4 text-white sm:col-span-1">
            <p className="text-xs font-bold">{isZh ? "体检可省 / 月" : "Savings / Mo"}</p>
            <p className="mt-1 font-mono text-2xl font-extrabold">
              {formatMoney(report.savingsUsd, currency)}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border-2 border-black bg-[#FFF8E7] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-zinc-700">
            <span>
              {isZh ? `订阅清单（共 ${items.length} 项）` : `Active Stack (${items.length} items)`}
            </span>
            <span>
              {isZh ? `最大分类：${report.topCategory}` : `Top Category: ${report.topCategory}`}
            </span>
          </div>
          <ul className="mt-3 divide-y-2 divide-black/15 text-sm">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-center justify-between py-2.5">
                <span className="font-bold">{item.name}</span>
                <span className="font-mono font-extrabold">
                  {formatMoney(item.monthlyUsd, currency)} / {isZh ? "月" : "mo"}
                </span>
              </li>
            ))}
            {report.apiSpendUsd > 0 && (
              <li className="flex items-center justify-between py-2.5">
                <span className="font-bold text-zinc-700">
                  {isZh ? "API 按量估算" : "Pay-as-You-Go API"}
                </span>
                <span className="font-mono font-extrabold">
                  {formatMoney(report.apiSpendUsd, currency)} / {isZh ? "月" : "mo"}
                </span>
              </li>
            )}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-black pt-5 text-xs font-bold">
          <span>
            {isZh ? `已被查看 ${report.viewCount} 次` : `Viewed ${report.viewCount} times`}
          </span>
          <Link
            href="/"
            className="brutal-btn rounded-xl bg-[#3B82F6] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-blue-600"
          >
            {isZh ? "我也来测测自己的 AI 账单 →" : "Audit My Own AI Stack →"}
          </Link>
        </div>
      </div>
    </main>
  );
}
