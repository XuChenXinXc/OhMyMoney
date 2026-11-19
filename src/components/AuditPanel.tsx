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
      {/* Budget Health */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">
              {isZh ? "月度预算红线监控" : "Monthly Budget Health"}
            </h2>
            <p className="text-xs text-slate-500">
              {isZh
                ? `当前月均 ${formatMoney(monthlyTotalUsd, currency)} / 预算上限 ${formatMoney(budgetUsd, currency)}`
                : `${formatMoney(monthlyTotalUsd, currency)} spent of ${formatMoney(budgetUsd, currency)} budget`}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              pct > 100
                ? "bg-rose-100 text-rose-700"
                : pct >= 80
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {budgetUsd > 0 ? `${pct}%` : isZh ? "未设预算" : "No cap"}
          </span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              pct > 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Diagnostic Cards */}
        <div className="space-y-3 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">
              {isZh ? "浪费体检与一键瘦身" : "Automated Waste Audit"}
            </h2>
            <span className="text-xs font-semibold text-emerald-600">
              {isZh
                ? `潜在月省 ${formatMoney(audit.totalSaveUsd, currency)}`
                : `Save up to ${formatMoney(audit.totalSaveUsd, currency)}/mo`}
            </span>
          </div>

          {audit.issues.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <p className="font-bold">
                {isZh ? "你的 AI 账单非常健康！" : "Your AI stack looks super lean!"}
              </p>
              <p className="mt-1 text-xs opacity-80">
                {isZh
                  ? "未检测到重叠付费或低频闲置订阅。"
                  : "No overlapping flagship plans or idle subscriptions detected."}
              </p>
            </div>
          ) : (
            audit.issues.map((issue) => (
              <div
                key={issue.id}
                className={`rounded-2xl border p-4 ${
                  issue.severity === "high"
                    ? "border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/30"
                    : issue.severity === "medium"
                      ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/30"
                      : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-bold">{issue.title}</h3>
                  <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-bold text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-emerald-400 dark:ring-slate-700">
                    {isZh ? "可省 " : "Save "}
                    {formatMoney(issue.saveUsd, currency)}/{isZh ? "月" : "mo"}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {issue.desc}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    issue.actionType === "remove-sub"
                      ? onRemoveSub(issue.targetId)
                      : onSwitchAnnual(issue.targetId)
                  }
                  className="mt-3 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-emerald-500 dark:text-slate-950"
                >
                  {issue.actionLabel}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Right: Obsidian Shareable Card + PNG Export + Backend Short Link */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl ring-1 ring-emerald-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                ohmymoney.money
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                <Sparkles className="h-3 w-3" />
                {tier.badge}
              </span>
            </div>

            <h3 className="mt-4 text-xl font-extrabold">
              {isZh ? "我的 AI 订阅体检账单" : "My AI Spend Receipt"}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{tier.roast}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-800/70 p-4">
              <div>
                <p className="text-[11px] text-slate-400">{isZh ? "月均支出" : "Monthly"}</p>
                <p className="mt-0.5 text-2xl font-extrabold">
                  {formatMoney(monthlyTotalUsd, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">{isZh ? "年化账单" : "Annual"}</p>
                <p className="mt-0.5 text-2xl font-extrabold text-emerald-400">
                  {formatMoney(monthlyTotalUsd * 12, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">{isZh ? "在用工具" : "Tools"}</p>
                <p className="mt-0.5 text-sm font-bold">
                  {subscriptions.length}
                  {apiSpendUsd > 0 ? " + API" : ""}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">{isZh ? "可省金额/月" : "Save / mo"}</p>
                <p className="mt-0.5 text-sm font-bold text-amber-300">
                  {formatMoney(audit.totalSaveUsd, currency)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                <Download className="h-4 w-4" />
                <span>{isZh ? "一键下载高清 PNG 晒单图" : "Download High-DPI PNG Card"}</span>
              </button>

              <button
                type="button"
                disabled={sharing}
                onClick={handleCreateShortLink}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15 disabled:opacity-50"
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
                <div className="rounded-xl bg-slate-950/80 px-3 py-2 text-[11px] text-emerald-300 break-all">
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
