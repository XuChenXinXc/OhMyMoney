"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Plus, Search, Trash2, X } from "lucide-react";
import {
  BillingCycle,
  CURRENCY_META,
  CatalogTool,
  CurrencyCode,
  ModelBrandMeta,
  Region,
  UsageLevel,
  UserSubscription,
  formatMoney,
  fromCurrencyToUsd,
  fromUsdToCurrency,
  getSubMonthlyUsd,
  getToolBrand,
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

interface BrandGroup {
  brand: ModelBrandMeta;
  tiers: CatalogTool[];
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
  const [query, setQuery] = useState("");
  const [modalBrandId, setModalBrandId] = useState<string | null>(null);

  const activeIds = useMemo(() => new Set(subscriptions.map((s) => s.id)), [subscriptions]);
  const catLabels = CATEGORY_LABELS[locale];
  const curMeta = CURRENCY_META[currency];

  useEffect(() => {
    if (!modalBrandId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalBrandId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalBrandId]);

  const allBrandGroups = useMemo<BrandGroup[]>(() => {
    const map = new Map<string, BrandGroup>();
    catalog.forEach((tool) => {
      const brand = getToolBrand(tool);
      const existing = map.get(brand.id);
      if (existing) {
        existing.tiers.push(tool);
      } else {
        map.set(brand.id, { brand, tiers: [tool] });
      }
    });
    return Array.from(map.values()).map((g) => ({
      ...g,
      tiers: g.tiers.sort((a, b) => a.priceUsd - b.priceUsd),
    }));
  }, [catalog]);

  const visibleBrandGroups = useMemo<BrandGroup[]>(() => {
    const q = query.trim().toLowerCase();
    return allBrandGroups.filter(({ brand, tiers }) => {
      if (regionFilter !== "all" && brand.region !== regionFilter) return false;
      if (!q) return true;
      return (
        brand.nameZh.toLowerCase().includes(q) ||
        brand.nameEn.toLowerCase().includes(q) ||
        brand.tagsZh.some((t) => t.toLowerCase().includes(q)) ||
        brand.tagsEn.some((t) => t.toLowerCase().includes(q)) ||
        tiers.some(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.nameEn.toLowerCase().includes(q) ||
            t.noteZh.toLowerCase().includes(q) ||
            t.noteEn.toLowerCase().includes(q)
        )
      );
    });
  }, [allBrandGroups, regionFilter, query]);

  const modalGroup = useMemo(() => {
    if (!modalBrandId) return null;
    return allBrandGroups.find((g) => g.brand.id === modalBrandId) ?? null;
  }, [allBrandGroups, modalBrandId]);

  return (
    <div className="space-y-6">
      {/* Brand-First Multi-Tier Catalog Card */}
      <div className="brutal-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-extrabold">
              {isZh ? "👇 按 AI 模型选档位（点击模型弹窗选档）" : "👇 Pick AI Model & Subscription Tier"}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {isZh
                ? "涵盖海外与国内 27 款主流 AI（ChatGPT / Claude / Cursor / Command Code / OpenCode / 智谱 GLM / MiniMax 等）"
                : "27 global & China AI brands with full tiers (ChatGPT, Claude, Cursor, Command Code, OpenCode, Zhipu GLM, MiniMax & more)."}
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

        {/* Search + Region-Only Filter (All / Global / China) */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isZh
                  ? "搜模型、档位或标签（如 GPT / 智谱 / 编程 / 搜索）..."
                  : "Search model, tier, or tag (GPT, GLM, Coding...)"
              }
              className="w-full rounded-xl border-2 border-black bg-[#FFF8E7] py-1.5 pl-8 pr-3 text-xs font-bold text-black outline-none focus:bg-white dark:border-zinc-200 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            {(["all", "global", "china"] as const).map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => setRegionFilter(reg)}
                className={`brutal-btn rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition ${
                  regionFilter === reg
                    ? "bg-black text-[#FFE500] dark:bg-[#FFE500] dark:text-black"
                    : "bg-[#FFF8E7] text-black hover:bg-[#FFE500]/50 dark:bg-zinc-900 dark:text-white"
                }`}
              >
                {reg === "all"
                  ? isZh
                    ? "全部"
                    : "All"
                  : reg === "global"
                    ? isZh
                      ? "海外"
                      : "Global"
                    : isZh
                      ? "国内"
                      : "China"}
              </button>
            ))}
          </div>
        </div>

        {/* Brand Grid */}
        {visibleBrandGroups.length === 0 ? (
          <div className="mt-5 rounded-xl border-2 border-dashed border-black/25 py-8 text-center text-xs font-bold text-zinc-500">
            {isZh ? "没有找到匹配的 AI 模型，可点击右上角添加自定义订阅。" : "No matching AI models found."}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleBrandGroups.map(({ brand, tiers }) => {
              const selectedTiers = tiers.filter((t) => activeIds.has(t.id));
              const isSingleTier = tiers.length === 1;
              const minPrice = tiers[0].priceUsd;
              const maxPrice = tiers[tiers.length - 1].priceUsd;
              const tags = isZh ? brand.tagsZh : brand.tagsEn;

              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => {
                    if (isSingleTier) {
                      onToggleTool(tiers[0]);
                    } else {
                      setModalBrandId(brand.id);
                    }
                  }}
                  className={`brutal-btn flex flex-col justify-between rounded-xl p-3.5 text-left transition ${
                    selectedTiers.length > 0
                      ? "bg-[#00E599] text-black"
                      : "bg-[#FFF8E7] text-black hover:bg-[#FFE500] dark:bg-zinc-900 dark:text-white dark:hover:bg-[#FFE500] dark:hover:text-black"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1.5">
                    <span className="rounded border border-black bg-white px-1.5 py-0.5 font-mono text-[10px] font-black text-black">
                      {brand.badge}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded border border-black/20 bg-black/5 px-1.5 py-0.5 text-[10px] font-black">
                      {isSingleTier ? (
                        selectedTiers.length > 0 ? (
                          isZh ? "✓ 已选" : "✓ On"
                        ) : isZh ? (
                          "+ 加入"
                        ) : (
                          "+ Add"
                        )
                      ) : (
                        <>
                          <span>
                            {tiers.length} {isZh ? "档" : "tiers"}
                          </span>
                          <ArrowUpRight className="h-3 w-3" />
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <p className="font-display text-sm font-extrabold leading-tight">
                      {isZh ? brand.nameZh : brand.nameEn}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-black/30 bg-white/85 px-1.5 py-0.5 text-[10px] font-bold text-black"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] font-bold opacity-80">
                      {minPrice === 0 && maxPrice === 0
                        ? isZh
                          ? "免费"
                          : "Free"
                        : minPrice === maxPrice
                          ? formatMoney(minPrice, currency)
                          : `${formatMoney(minPrice, currency)} – ${formatMoney(maxPrice, currency)}`}
                    </p>
                  </div>

                  {selectedTiers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedTiers.map((st) => (
                        <span
                          key={st.id}
                          className="rounded border border-black bg-black px-1.5 py-0.5 text-[10px] font-black text-[#00E599]"
                        >
                          {isZh ? st.name : st.nameEn}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Centered Tier Selection Modal */}
      {modalGroup && modalGroup.tiers.length > 1 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalBrandId(null);
          }}
        >
          <div className="brutal-card flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#FFF8E7] text-black dark:bg-[#1B1B22] dark:text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-[2.5px] border-black bg-[#FFE500] px-5 py-4 text-black">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg border-2 border-black bg-white px-2 py-0.5 font-mono text-xs font-black text-black">
                  {modalGroup.brand.badge}
                </span>
                <div>
                  <h3 className="font-display text-base font-black leading-tight">
                    {isZh ? modalGroup.brand.nameZh : modalGroup.brand.nameEn}
                  </h3>
                  <p className="text-[11px] font-bold opacity-80">
                    {isZh
                      ? `共 ${modalGroup.tiers.length} 个订阅档位 · 已选 ${modalGroup.tiers.filter((t) => activeIds.has(t.id)).length} 档`
                      : `${modalGroup.tiers.length} subscription tiers · ${modalGroup.tiers.filter((t) => activeIds.has(t.id)).length} selected`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setModalBrandId(null)}
                className="brutal-btn flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black"
              >
                <X className="h-4 w-4 stroke-[3]" />
              </button>
            </div>

            {/* Tier Cards Grid */}
            <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
              {modalGroup.tiers.map((tier) => {
                const selected = activeIds.has(tier.id);
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => onToggleTool(tier)}
                    className={`brutal-btn flex flex-col justify-between rounded-xl p-4 text-left ${
                      selected
                        ? "bg-[#00E599] text-black"
                        : "bg-white text-black hover:bg-[#FFE500]/30 dark:bg-zinc-900 dark:text-white"
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-sm font-extrabold">
                          {isZh ? tier.name : tier.nameEn}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] font-bold opacity-70">
                          {tier.nativePriceLabel}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-base font-black">
                        {tier.priceUsd === 0
                          ? isZh
                            ? "免费"
                            : "Free"
                          : formatMoney(tier.priceUsd, currency)}
                      </span>
                    </div>
                    <p className="mt-2.5 text-xs font-medium leading-relaxed opacity-80">
                      {isZh ? tier.noteZh : tier.noteEn}
                    </p>
                    <div className="mt-3 flex w-full items-center justify-between border-t border-black/15 pt-2.5">
                      <span className="text-[10px] font-bold opacity-70">
                        {tier.annualMonthlyUsd < tier.priceUsd
                          ? isZh
                            ? `年付约 ${formatMoney(tier.annualMonthlyUsd, currency)}/月`
                            : `Annual ~${formatMoney(tier.annualMonthlyUsd, currency)}/mo`
                          : tier.priceUsd === 0
                            ? isZh
                              ? "免费可用"
                              : "Free tier"
                            : isZh
                              ? "按月计费"
                              : "Monthly billing"}
                      </span>
                      <span
                        className={`rounded-md border border-black px-2.5 py-0.5 text-[11px] font-black ${
                          selected ? "bg-black text-[#00E599]" : "bg-[#FFE500] text-black"
                        }`}
                      >
                        {selected ? (isZh ? "✓ 已加入账单" : "✓ Added") : isZh ? "+ 加入账单" : "+ Add"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t-[2.5px] border-black bg-white px-5 py-3 text-black dark:bg-zinc-950 dark:text-white">
              <span className="text-xs font-bold opacity-75">
                {isZh ? "点击卡片即可勾选或取消，支持同品牌多选" : "Click any tier to toggle; multi-select supported"}
              </span>
              <button
                type="button"
                onClick={() => setModalBrandId(null)}
                className="brutal-btn rounded-xl bg-black px-5 py-2 text-xs font-black text-[#FFE500]"
              >
                {isZh ? "选好了" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              ? "目前没有已选订阅，点击上方 AI 模型弹窗选择对应档位即可开始算账。"
              : "No active subscriptions yet. Click any AI model above to pick your tier."}
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
                      <span className="font-mono font-black">
                        {formatMoney(getSubMonthlyUsd(sub), currency)}
                      </span>
                      /{isZh ? "月" : "mo"} ·{" "}
                      {isZh ? `每月 ${sub.renewalDay} 号续费` : `Renews day ${sub.renewalDay}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-lg border-2 border-black bg-white px-2 py-1 text-black">
                      <span className="font-mono text-xs font-black text-zinc-500">
                        {curMeta.symbol}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={curMeta.decimals === 0 ? 1 : 0.01}
                        aria-label="price"
                        value={displayVal}
                        onChange={(e) => {
                          const raw = Math.max(0, parseFloat(e.target.value) || 0);
                          const usd = fromCurrencyToUsd(raw, currency);
                          onUpdateSub(
                            sub.id,
                            sub.billingCycle === "annual"
                              ? { annualMonthlyUsd: usd }
                              : { priceUsd: usd }
                          );
                        }}
                        className="w-16 bg-transparent pl-1 font-mono text-xs font-black outline-none"
                      />
                    </div>

                    <select
                      aria-label="billing cycle"
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
                      aria-label="usage"
                      value={sub.usage}
                      onChange={(e) =>
                        onUpdateSub(sub.id, { usage: e.target.value as UsageLevel })
                      }
                      className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-extrabold text-black outline-none"
                    >
                      <option value="high">{isZh ? "高频" : "Heavy"}</option>
                      <option value="medium">{isZh ? "中频" : "Regular"}</option>
                      <option value="low">{isZh ? "低频" : "Low"}</option>
                    </select>

                    <div className="flex items-center rounded-lg border-2 border-black bg-white px-2 py-1 text-black">
                      <span className="text-[10px] font-bold text-zinc-500">
                        {isZh ? "续费日" : "Day"}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        aria-label="renewal day"
                        value={sub.renewalDay}
                        onChange={(e) => {
                          const d = Math.min(28, Math.max(1, parseInt(e.target.value, 10) || 1));
                          onUpdateSub(sub.id, { renewalDay: d });
                        }}
                        className="w-10 bg-transparent pl-1 text-center font-mono text-xs font-black outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveSub(sub.id)}
                      aria-label="remove"
                      className="rounded-lg border-2 border-black bg-[#FF5C5C] p-1.5 text-white transition hover:bg-rose-600"
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
