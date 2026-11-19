"use client";

import { useState } from "react";
import { Download, Link2, Sparkles } from "lucide-react";
import { CurrencyCode, UserSubscription, formatMoney, getSubMonthlyUsd } from "@/lib/catalog";
import { AuditResult } from "@/lib/diagnostics";
import { Locale, TIER_COPY } from "@/lib/i18n";
import { renderShareCardDataUrl } from "@/lib/renderShareCard";

interface Props {
  locale: Locale;
  currency: CurrencyCode;
  subscriptions: UserSubscription[];
  apiSpendUsd: number;
  budgetUsd: number;
  monthlyTotalUsd: number;
  topCategoryLabel: string;
  audit: AuditResult;
  onRemoveSub: (id: string) => void;
  onSwitchAnnual: (id: string) => void;
  onToast: (msg: string) => void;
}

export function AuditPanel({
  locale,
  currency,
  subscriptions,
  apiSpendUsd,
  budgetUsd,
  monthlyTotalUsd,
  topCategoryLabel,
  audit,
  onRemoveSub,
  onSwitchAnnual,
  onToast,
}: Props) {
  const isZh = locale === "zh";
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const tier = TIER_COPY[locale][audit.tierKey] ?? TIER_COPY[locale].minimalist;
  const pct = budgetUsd > 0 ? Math.round((monthlyTotalUsd / budgetUsd) * 100) : 0;

  function handleDownloadPng() {
    const dataUrl = renderShareCardDataUrl({
      locale,
      currency,
      monthlyUsd: monthlyTotalUsd,
      yearlyUsd: monthlyTotalUsd * 12,
      savingsUsd: audit.totalSaveUsd,
      subCount: subscriptions.length,
      apiSpendUsd,
      tierKey: audit.tierKey,
      topCategoryLabel,
      topTools: subscriptions.map((s) => (isZh ? s.name : s.nameEn)),
    });
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `ohmymoney-audit-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onToast(isZh ? "高清 PNG 晒单图已下载！" : "High-DPI PNG receipt downloaded!");
  }

  async function handleCreateShortLink() {
    setSharing(true);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          currency,
          monthlyTotalUsd,
          yearlyTotalUsd: monthlyTotalUsd * 12,
          savingsUsd: audit.totalSaveUsd,
          apiSpendUsd,
          budgetUsd,
          tierKey: audit.tierKey,
          topCategory: topCategoryLabel,
          items: subscriptions.map((s) => ({
            name: isZh ? s.name : s.nameEn,
            category: s.category,
            monthlyUsd: getSubMonthlyUsd(s),
            billingCycle: s.billingCycle,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast(data.error || (isZh ? "生成短链失败，请先初始化数据库" : "Failed to create link"));
        return;
      }
      setShareUrl(data.url);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.url).catch(() => {});
      }
      onToast(isZh ? "公开分享短链已生成并复制！" : "Shareable short link created & copied!");
    } catch {
      onToast(isZh ? "网络请求失败" : "Network error");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Budget Health Bar */}
      <div className="brutal-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-extrabold">
              {isZh ? "月度预算红线监控" : "Monthly Budget Health"}
            </h2>
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {isZh
                ? `当前月均 ${formatMoney(monthlyTotalUsd, currency)} / 预算上限 ${formatMoney(budgetUsd, currency)}`
                : `${formatMoney(monthlyTotalUsd, currency)} spent of ${formatMoney(budgetUsd, currency)} budget`}
            </p>
          </div>
          <span
            className={`rounded-lg border-2 border-black px-3 py-1 font-mono text-xs font-black ${
              pct > 100
                ? "bg-[#FF5C5C] text-white"
                : pct >= 80
                  ? "bg-[#FFE500] text-black"
                  : "bg-[#00E599] text-black"
            }`}
          >
            {budgetUsd > 0 ? `${pct}%` : isZh ? "未设预算" : "No cap"}
          </span>
        </div>
        <div className="mt-3.5 h-4 w-full overflow-hidden rounded-full border-2 border-black bg-[#FFF8E7]">
          <div
            className={`h-full transition-all duration-300 ${
              pct > 100 ? "bg-[#FF5C5C]" : pct >= 80 ? "bg-[#FFE500]" : "bg-[#00E599]"
            }`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Diagnostic Cards */}
        <div className="space-y-3.5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">
              {isZh ? "⚡ 浪费体检与一键瘦身" : "⚡ Automated Waste Audit"}
            </h2>
            <span className="rounded-lg border-2 border-black bg-[#00E599] px-3 py-1 font-mono text-xs font-black text-black">
              {isZh
                ? `潜在月省 ${formatMoney(audit.totalSaveUsd, currency)}`
                : `Save ${formatMoney(audit.totalSaveUsd, currency)}/mo`}
            </span>
          </div>

          {audit.issues.length === 0 ? (
            <div className="brutal-card bg-[#00E599] p-5 text-black dark:bg-[#00E599] dark:text-black">
              <p className="font-display text-base font-black">
                {isZh ? "🎉 你的 AI 账单非常健康！" : "🎉 Your AI stack looks super lean!"}
              </p>
              <p className="mt-1 text-xs font-bold opacity-85">
                {isZh
                  ? "未检测到重叠付费或低频闲置订阅。"
                  : "No overlapping flagship plans or idle subscriptions detected."}
              </p>
            </div>
          ) : (
            audit.issues.map((issue) => (
              <div
                key={issue.id}
                className={`brutal-card p-5 text-black ${
                  issue.severity === "high"
                    ? "bg-[#FFE5E5]"
                    : issue.severity === "medium"
                      ? "bg-[#FFF3C4]"
                      : "bg-[#E6FFF5]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-display text-sm font-extrabold">{issue.title}</h3>
                  <span className="rounded-md border-2 border-black bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-black">
                    {isZh ? "可省 " : "Save "}
                    {formatMoney(issue.saveUsd, currency)}/{isZh ? "月" : "mo"}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-zinc-800">
                  {issue.desc}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    issue.actionType === "remove-sub"
                      ? onRemoveSub(issue.targetId)
                      : onSwitchAnnual(issue.targetId)
                  }
                  className="brutal-btn mt-3.5 rounded-xl bg-black px-4 py-2 text-xs font-extrabold text-[#FFE500] hover:bg-zinc-900"
                >
                  {issue.actionLabel}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Right: Pop Share Card */}
        <div className="lg:col-span-5">
          <div className="brutal-card bg-[#111116] p-6 text-white dark:bg-[#111116]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black uppercase tracking-widest text-[#FFE500]">
                OhMyMoney
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-[#00E599] px-2.5 py-0.5 text-[11px] font-black text-black">
                <Sparkles className="h-3 w-3" />
                {tier.badge}
              </span>
            </div>

            <h3 className="mt-4 font-display text-2xl font-extrabold">
              {isZh ? "我的 AI 订阅体检账单" : "My AI Spend Receipt"}
            </h3>
            <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-300">{tier.roast}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border-2 border-white/20 bg-white/5 p-4">
              <div>
                <p className="text-[11px] text-zinc-400">{isZh ? "月均支出" : "Monthly"}</p>
                <p className="mt-0.5 font-mono text-2xl font-black text-[#FFE500]">
                  {formatMoney(monthlyTotalUsd, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400">{isZh ? "年化账单" : "Annual"}</p>
                <p className="mt-0.5 font-mono text-2xl font-black text-[#00E599]">
                  {formatMoney(monthlyTotalUsd * 12, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400">{isZh ? "在用工具" : "Tools"}</p>
                <p className="mt-0.5 font-mono text-sm font-bold">
                  {subscriptions.length}
                  {apiSpendUsd > 0 ? " + API" : ""}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400">{isZh ? "可省金额/月" : "Save / mo"}</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-[#FF5C5C]">
                  {formatMoney(audit.totalSaveUsd, currency)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="brutal-btn inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00E599] px-4 py-3 text-xs font-black text-black hover:bg-emerald-300"
              >
                <Download className="h-4 w-4" />
                <span>{isZh ? "一键下载高清 PNG 晒单图" : "Download High-DPI PNG Card"}</span>
              </button>

              <button
                type="button"
                disabled={sharing}
                onClick={handleCreateShortLink}
                className="brutal-btn inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFE500] px-4 py-3 text-xs font-black text-black hover:bg-yellow-300 disabled:opacity-50"
              >
                <Link2 className="h-4 w-4" />
                <span>
                  {sharing
                    ? isZh
                      ? "正在生成短链..."
                      : "Generating..."
                    : isZh
                      ? "生成可访问的分享短链 (/s/...)"
                      : "Create Public Share Short-Link"}
                </span>
              </button>

              {shareUrl && (
                <div className="break-all rounded-xl border-2 border-[#00E599] bg-black px-3 py-2 font-mono text-[11px] text-[#00E599]">
                  {shareUrl}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
