import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CurrencyCode, formatMoney } from "@/lib/catalog";
import { TIER_COPY } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface SharedItem {
  name: string;
  category: string;
  monthlyUsd: number;
  billingCycle: string;
}

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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

  const currency = (["USD", "CNY", "JPY"].includes(report.currency)
    ? report.currency
    : "USD") as CurrencyCode;
  const tier = TIER_COPY.zh[report.tierKey] ?? TIER_COPY.zh.minimalist;

  let items: SharedItem[] = [];
  try {
    items = JSON.parse(report.itemsJson);
  } catch {
    items = [];
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12">
      <div className="overflow-hidden rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 text-white shadow-2xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/" className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            ohmymoney.money
          </Link>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/40">
            {tier.badge}
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">AI 订阅体检分享账单</h1>
        <p className="mt-1.5 text-sm text-slate-300">{tier.roast}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-800/80 p-4">
            <p className="text-xs text-slate-400">月均总支出</p>
            <p className="mt-1 text-2xl font-extrabold">{formatMoney(report.monthlyTotalUsd, currency)}</p>
          </div>
          <div className="rounded-2xl bg-slate-800/80 p-4">
            <p className="text-xs text-slate-400">年化预估</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-400">
              {formatMoney(report.yearlyTotalUsd, currency)}
            </p>
          </div>
          <div className="col-span-2 rounded-2xl bg-slate-800/80 p-4 sm:col-span-1">
            <p className="text-xs text-slate-400">体检可省 / 月</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-300">
              {formatMoney(report.savingsUsd, currency)}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>订阅清单（共 {items.length} 项）</span>
            <span>最大分类：{report.topCategory}</span>
          </div>
          <ul className="mt-3 divide-y divide-slate-800 text-sm">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-center justify-between py-2">
                <span className="font-semibold text-slate-100">{item.name}</span>
                <span className="font-bold text-emerald-300">
                  {formatMoney(item.monthlyUsd, currency)} / 月
                </span>
              </li>
            ))}
            {report.apiSpendUsd > 0 && (
              <li className="flex items-center justify-between py-2">
                <span className="font-semibold text-slate-300">API 按量估算</span>
                <span className="font-bold text-slate-200">
                  {formatMoney(report.apiSpendUsd, currency)} / 月
                </span>
              </li>
            )}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5 text-xs text-slate-400">
          <span>已被查看 {report.viewCount} 次</span>
          <Link
            href="/"
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            我也来测测自己的 AI 账单 &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
