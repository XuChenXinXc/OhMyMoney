"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  BillingCycle,
  CatalogTool,
  CurrencyCode,
  Region,
  ToolCategory,
  UsageLevel,
  UserSubscription,
  formatMoney,
  getSubMonthlyUsd,
} from "@/lib/catalog";
import { CATEGORY_LABELS, Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  currency: CurrencyCode;
  catalog: CatalogTool[];
  subscriptions: UserSubscription[];
  onToggleTool: (tool: CatalogTool) => void;
  onUpdateSub: (id: string, patch: Partial<UserSubscription>) => void;
  onRemoveSub: (id: string) => void;
  onOpenCustom: () => void;
}

export function CatalogPicker({
  locale,
  currency,
  catalog,
  subscriptions,
  onToggleTool,
  onUpdateSub,
  onRemoveSub,
  onOpenCustom,
}: Props) {
  const isZh = locale === "zh";
  const [regionFilter, setRegionFilter] = useState<"all" | Region>("all");
  const [catFilter, setCatFilter] = useState<"all" | ToolCategory>("all");

  const activeIds = new Set(subscriptions.map((s) => s.id));
  const filtered = catalog.filter((t) => {
    if (regionFilter !== "all" && t.region !== regionFilter) return false;
    if (catFilter !== "all" && t.category !== catFilter) return false;
    return true;
  });

  const catLabels = CATEGORY_LABELS[locale];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">
              {isZh ? "国内外 AI 工具价格库（一键勾选）" : "Global & China AI Tool Catalog"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isZh
                ? "覆盖 2026 主流海外与国产工具，加入后可在下方随时修改实付价"
                : "Verified 2026 pricing across global and Chinese AI tools. Customize any price below."}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCustom}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isZh ? "添加自定义订阅" : "Add Custom Tool"}</span>
          </button>
        </div>

        {/* Region + Category Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["all", "global", "china"] as const).map((reg) => (
            <button
              key={reg}
              type="button"
              onClick={() => setRegionFilter(reg)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                regionFilter === reg
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {reg === "all"
                ? isZh
                  ? "全部地区"
                  : "All Regions"
                : reg === "global"
                  ? isZh
                    ? "海外主流"
                    : "Global"
                  : isZh
                    ? "国内主流"
                    : "China"}
            </button>
          ))}
          <span className="mx-1 text-slate-300 dark:text-slate-700">|</span>
          {(["all", "chat", "search", "coding", "visual", "audio"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFilter(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                catFilter === cat
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {catLabels[cat]}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool) => {
            const selected = activeIds.has(tool.id);
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onToggleTool(tool)}
                className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                  selected
                    ? "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500/30 dark:bg-emerald-950/40"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold">{isZh ? tool.name : tool.nameEn}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {catLabels[tool.category]}
                      </span>
                      <span className="text-[10px] text-slate-400">{tool.nativePriceLabel}</span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-extrabold ${
                      selected ? "text-emerald-700 dark:text-emerald-400" : ""
                    }`}
                  >
                    {tool.priceUsd === 0
                      ? isZh
                        ? "免费"
                        : "Free"
                      : `${formatMoney(tool.priceUsd, currency)}`}
                  </span>
                </div>
                <div className="mt-2.5 flex w-full items-center justify-between gap-2">
                  <span className="line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {isZh ? tool.noteZh : tool.noteEn}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      selected
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {selected ? (isZh ? "已加入" : "Added") : isZh ? "+ 加入" : "+ Add"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Subscriptions Editor */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">
            {isZh ? "我的在用订阅明细" : "My Active Subscriptions"}
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {subscriptions.length} {isZh ? "项" : "items"}
          </span>
        </div>

        {subscriptions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-slate-800">
            {isZh
              ? "目前没有已选订阅，在上方点选工具或添加自定义订阅即可开始算账。"
              : "No active subscriptions yet. Pick tools above or add a custom one."}
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{isZh ? sub.name : sub.nameEn}</span>
                    <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                      {catLabels[sub.category]}
                    </span>
                    {sub.usage === "low" && (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        {isZh ? "低频闲置" : "Rarely used"}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {isZh ? "折合月均" : "Effective"}{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {formatMoney(getSubMonthlyUsd(sub), currency)}
                    </strong>{" "}
                    · {isZh ? `每月 ${sub.renewalDay} 日续费` : `Renews day ${sub.renewalDay}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                    <span className="text-slate-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={sub.billingCycle === "annual" ? sub.annualMonthlyUsd : sub.priceUsd}
                      onChange={(e) => {
                        const v = Math.max(0, parseFloat(e.target.value) || 0);
                        onUpdateSub(
                          sub.id,
                          sub.billingCycle === "annual" ? { annualMonthlyUsd: v } : { priceUsd: v }
                        );
                      }}
                      className="w-16 bg-transparent font-bold focus:outline-none"
                    />
                  </label>

                  <select
                    value={sub.billingCycle}
                    onChange={(e) =>
                      onUpdateSub(sub.id, { billingCycle: e.target.value as BillingCycle })
                    }
                    className="rounded-lg bg-white px-2 py-1 text-xs font-semibold ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                  >
                    <option value="monthly">{isZh ? "月付" : "Monthly"}</option>
                    <option value="annual">{isZh ? "年付" : "Annual"}</option>
                  </select>

                  <select
                    value={sub.usage}
                    onChange={(e) => onUpdateSub(sub.id, { usage: e.target.value as UsageLevel })}
                    className="rounded-lg bg-white px-2 py-1 text-xs font-semibold ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                  >
                    <option value="high">{isZh ? "高频刚需" : "Daily / Heavy"}</option>
                    <option value="medium">{isZh ? "中频常用" : "Regular"}</option>
                    <option value="low">{isZh ? "低频闲置" : "Rarely Used"}</option>
                  </select>

                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={sub.renewalDay}
                    title={isZh ? "续费日" : "Renewal day"}
                    onChange={(e) =>
                      onUpdateSub(sub.id, {
                        renewalDay: Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)),
                      })
                    }
                    className="w-12 rounded-lg bg-white px-2 py-1 text-center text-xs font-bold ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                  />

                  <button
                    type="button"
                    onClick={() => onRemoveSub(sub.id)}
                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
