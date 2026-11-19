"use client";

import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import {
  BillingCycle,
  CURRENCY_META,
  CatalogTool,
  CurrencyCode,
  Region,
  ToolCategory,
  UsageLevel,
  UserSubscription,
  formatMoney,
  fromCurrencyToUsd,
  fromUsdToCurrency,
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
  onClearAll: () => void;
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
  onClearAll,
  onOpenCustom,
}: Props) {
  const isZh = locale === "zh";
  const [regionFilter, setRegionFilter] = useState<"all" | Region>("all");
  const [catFilter, setCatFilter] = useState<"all" | ToolCategory>("all");
  const [query, setQuery] = useState("");

  const activeIds = new Set(subscriptions.map((s) => s.id));
  const q = query.trim().toLowerCase();
  const filtered = catalog.filter((t) => {
    if (regionFilter !== "all" && t.region !== regionFilter) return false;
    if (catFilter !== "all" && t.category !== catFilter) return false;
    if (
      q &&
      !t.name.toLowerCase().includes(q) &&
      !t.nameEn.toLowerCase().includes(q) &&
      !t.noteZh.toLowerCase().includes(q) &&
      !t.noteEn.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });

  const catLabels = CATEGORY_LABELS[locale];
  const curMeta = CURRENCY_META[currency];

  return (
    <div className="space-y-6">
      {/* Catalog Card */}
      <div className="brutal-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-extrabold">
              {isZh ? "👇 国内外 AI 工具价格库（一键勾选）" : "👇 Global & China AI Tool Catalog"}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {isZh
                ? "覆盖 2026 主流海外与国产工具，加入后可在下方按当前币种随时修改实付价"
                : "Verified 2026 pricing across global and China AI tools. Edit any price in your selected currency below."}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCustom}
            className="brutal-btn inline-flex items-center gap-1.5 rounded-xl bg-[#FFE500] px-4 py-2 text-xs font-black text-black hover:bg-yellow-300"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>{isZh ? "添加自定义订阅" : "Add Custom Tool"}</span>
          </button>
        </div>

        {/* Search + Region + Category Filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isZh ? "搜索 ChatGPT / Cursor / Kimi..." : "Search ChatGPT, Cursor, Kimi..."}
              className="w-full rounded-xl border-2 border-black bg-[#FFF8E7] py-1.5 pl-8 pr-3 text-xs font-bold text-black outline-none focus:bg-white dark:border-zinc-200 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", "global", "china"] as const).map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => setRegionFilter(reg)}
                className={`rounded-lg border-2 border-black px-2.5 py-1 text-xs font-extrabold transition dark:border-zinc-200 ${
                  regionFilter === reg
                    ? "bg-[#3B82F6] text-white"
                    : "bg-[#FFF8E7] text-black hover:bg-[#FFE500]/50 dark:bg-zinc-900 dark:text-white"
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
            <span className="mx-0.5 font-black text-black/30 dark:text-white/30">/</span>
            {(["all", "chat", "search", "coding", "visual", "audio"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                className={`rounded-lg border-2 border-black px-2.5 py-1 text-xs font-extrabold transition dark:border-zinc-200 ${
                  catFilter === cat
                    ? "bg-black text-[#FFE500] dark:bg-[#FFE500] dark:text-black"
                    : "bg-white text-black hover:bg-[#FFE500]/40 dark:bg-zinc-900 dark:text-white"
                }`}
              >
                {catLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Pop Tool Grid */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border-2 border-dashed border-black/25 py-8 text-center text-xs font-bold text-zinc-500">
              {isZh ? "没有找到匹配的 AI 工具，可点击右上角添加自定义订阅。" : "No matching tools found. Click '+ Add Custom Tool' above."}
            </div>
          ) : (
            filtered.map((tool) => {
              const selected = activeIds.has(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onToggleTool(tool)}
                  className={`brutal-btn flex flex-col justify-between rounded-xl p-3.5 text-left ${
                    selected
                      ? "bg-[#00E599] text-black"
                      : "bg-[#FFF8E7] text-black hover:bg-[#FFE500]/50 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-sm font-extrabold">
                        {isZh ? tool.name : tool.nameEn}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="rounded border border-black bg-white px-1.5 py-0.5 text-[10px] font-bold text-black">
                          {catLabels[tool.category]}
                        </span>
                        <span className="text-[10px] font-semibold opacity-70">
                          {tool.nativePriceLabel}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-black">
                      {tool.priceUsd === 0
                        ? isZh
                          ? "免费"
                          : "Free"
                        : formatMoney(tool.priceUsd, currency)}
                    </span>
                  </div>
                  <div className="mt-3 flex w-full items-center justify-between gap-2">
                    <span className="line-clamp-1 text-[11px] font-medium opacity-80">
                      {isZh ? tool.noteZh : tool.noteEn}
                    </span>
                    <span
                      className={`shrink-0 rounded-md border border-black px-2 py-0.5 text-[10px] font-black ${
                        selected ? "bg-black text-[#00E599]" : "bg-white text-black"
                      }`}
                    >
                      {selected ? (isZh ? "✓ 已加入" : "✓ Added") : isZh ? "+ 加入" : "+ Add"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Active Subscriptions Editor */}
      <div className="brutal-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-extrabold">
            {isZh ? "我的在用订阅明细" : "My Active Subscriptions"}
          </h2>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border-2 border-black bg-[#FFE500] px-3 py-0.5 font-mono text-xs font-black text-black">
              {subscriptions.length} {isZh ? "项" : "items"}
            </span>
            {subscriptions.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="rounded-lg border-2 border-black bg-[#FF5C5C] px-2.5 py-0.5 text-xs font-black text-white transition hover:bg-rose-600"
              >
                {isZh ? "清空全部" : "Clear All"}
              </button>
            )}
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <div className="mt-4 rounded-xl border-2 border-dashed border-black/30 py-8 text-center text-xs font-bold text-zinc-500">
            {isZh
              ? "目前没有已选订阅，在上方点选工具或添加自定义订阅即可开始算账。"
              : "No active subscriptions yet. Pick tools above or add a custom one."}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {subscriptions.map((sub) => {
              const currentUsd = sub.billingCycle === "annual" ? sub.annualMonthlyUsd : sub.priceUsd;
              const displayVal = fromUsdToCurrency(currentUsd, currency);
              return (
                <div
                  key={sub.id}
                  className="flex flex-col gap-3 rounded-xl border-2 border-black bg-[#FFF8E7] p-3.5 text-black sm:flex-row sm:items-center sm:justify-between dark:border-zinc-200 dark:bg-zinc-900 dark:text-white"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-extrabold">
                        {isZh ? sub.name : sub.nameEn}
                      </span>
                      <span className="rounded border border-black bg-white px-1.5 py-0.5 text-[10px] font-bold text-black">
                        {catLabels[sub.category]}
                      </span>
                      {sub.usage === "low" && (
                        <span className="rounded border border-black bg-[#FF5C5C] px-1.5 py-0.5 text-[10px] font-black text-white">
                          {isZh ? "低频闲置" : "Rarely used"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] font-semibold opacity-75">
                      {isZh ? "折合月均" : "Effective"}{" "}
                      <strong className="font-mono font-black">
                        {formatMoney(getSubMonthlyUsd(sub), currency)}
                      </strong>{" "}
                      · {isZh ? `每月 ${sub.renewalDay} 日续费` : `Renews day ${sub.renewalDay}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className="flex items-center gap-1 rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-bold text-black"
                      title={isZh ? `按 ${currency} 修改实付价` : `Edit price in ${currency}`}
                    >
                      <span className="opacity-60">{curMeta.symbol}</span>
                      <input
                        type="number"
                        min={0}
                        step={curMeta.decimals === 0 ? 1 : 0.01}
                        value={displayVal}
                        onChange={(e) => {
                          const rawVal = Math.max(0, parseFloat(e.target.value) || 0);
                          const usd = fromCurrencyToUsd(rawVal, currency);
                          onUpdateSub(
                            sub.id,
                            sub.billingCycle === "annual"
                              ? { annualMonthlyUsd: usd }
                              : { priceUsd: usd }
                          );
                        }}
                        className="w-16 bg-transparent font-mono font-black focus:outline-none"
                      />
                    </label>

                    <select
                      value={sub.billingCycle}
                      onChange={(e) =>
                        onUpdateSub(sub.id, { billingCycle: e.target.value as BillingCycle })
                      }
                      className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-extrabold text-black outline-none"
                    >
                      <option value="monthly">{isZh ? "月付" : "Monthly"}</option>
                      <option value="annual">{isZh ? "年付" : "Annual"}</option>
                    </select>

                    <select
                      value={sub.usage}
                      onChange={(e) => onUpdateSub(sub.id, { usage: e.target.value as UsageLevel })}
                      className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-extrabold text-black outline-none"
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
                      className="w-12 rounded-lg border-2 border-black bg-white px-2 py-1 text-center font-mono text-xs font-black text-black outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => onRemoveSub(sub.id)}
                      className="rounded-lg border-2 border-black bg-[#FF5C5C] p-1.5 text-white transition hover:bg-rose-600"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
