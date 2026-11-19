"use client";

import { useState } from "react";
import { CatalogTool, CurrencyCode, formatMoney } from "@/lib/catalog";
import { PersonaKey, RecommendationPick, buildRecommendation } from "@/lib/diagnostics";
import { Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  currency: CurrencyCode;
  catalog: CatalogTool[];
  currentMonthlyUsd: number;
  onApplyRecommendation: (picks: RecommendationPick[]) => void;
}

const PERSONAS: { key: PersonaKey; zh: string; en: string }[] = [
  { key: "dev", zh: "独立开发者", en: "Indie Dev" },
  { key: "creator", zh: "内容创作者", en: "Creator" },
  { key: "student", zh: "学生 / 科研", en: "Student" },
  { key: "office", zh: "轻度办公", en: "Office" },
  { key: "china-value", zh: "国内极省组合", en: "China Value" },
];

export function RecommendPanel({
  locale,
  currency,
  catalog,
  currentMonthlyUsd,
  onApplyRecommendation,
}: Props) {
  const isZh = locale === "zh";
  const [persona, setPersona] = useState<PersonaKey>("dev");
  const [budgetUsd, setBudgetUsd] = useState(30);
  const [msgs, setMsgs] = useState(120);
  const [unitCost, setUnitCost] = useState(0.05);

  const rec = buildRecommendation(persona, budgetUsd, catalog);
  const diff = currentMonthlyUsd - rec.totalUsd;
  const apiEstUsd = msgs * unitCost;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold">
          {isZh ? "场景化高性价比 AI 订阅组合" : "Smart Value Bundle Recommender"}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {isZh
            ? "按角色和月度预算自动匹配无重叠、高性价比的国内外 AI 方案"
            : "Pick your persona and budget for a non-overlapping, high-ROI AI stack."}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex flex-wrap gap-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPersona(p.key)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    persona === p.key
                      ? "bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  }`}
                >
                  {isZh ? p.zh : p.en}
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="flex justify-between text-xs font-semibold">
              <span>{isZh ? "目标月预算" : "Target Budget"}</span>
              <span className="text-emerald-600">{formatMoney(budgetUsd, currency)} / mo</span>
            </div>
            <input
              type="range"
              min={5}
              max={80}
              step={5}
              value={budgetUsd}
              onChange={(e) => setBudgetUsd(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-extrabold">
                {isZh ? "推荐组合月均 " : "Recommended Total: "}
                {formatMoney(rec.totalUsd, currency)}
              </p>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {diff > 0.01
                  ? isZh
                    ? `比你当前账单每月省 ${formatMoney(diff, currency)}（年省 ${formatMoney(diff * 12, currency)}）`
                    : `Saves ${formatMoney(diff, currency)}/mo (${formatMoney(diff * 12, currency)}/yr) vs your current stack`
                  : isZh
                    ? "已为你匹配当前预算内性价比最高方案"
                    : "Optimized for maximum value within your target budget"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onApplyRecommendation(rec.picks)}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-emerald-500 dark:text-slate-950"
            >
              {isZh ? "一键套用到我的账单" : "Apply to My Stack"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {rec.picks.map((pick) => (
              <div
                key={pick.tool.id}
                className="rounded-xl border border-emerald-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">
                    {isZh ? pick.tool.name : pick.tool.nameEn}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600">
                    {pick.effectiveUsd === 0
                      ? isZh
                        ? "免费"
                        : "Free"
                      : `${formatMoney(pick.effectiveUsd, currency)}/mo`}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {isZh ? pick.reasonZh : pick.reasonEn}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            <strong>{isZh ? "省钱建议：" : "Pro Tip: "}</strong>
            {isZh ? rec.tipZh : rec.tipEn}
          </p>
        </div>
      </div>

      {/* API vs $20 Subscription Break-even */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold">
          {isZh ? "「包月 $20 会员」vs「按量 API」临界点测算" : "$20 Subscription vs Pay-as-You-Go API"}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div>
              <div className="flex justify-between text-xs font-semibold">
                <span>{isZh ? "每月深度对话 / 复杂任务次数" : "Heavy prompts / tasks per month"}</span>
                <span>{msgs}</span>
              </div>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={msgs}
                onChange={(e) => setMsgs(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold">
                <span>{isZh ? "单次调用预估成本 (USD)" : "Est. cost per prompt (USD)"}</span>
                <span>${unitCost.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.25}
                step={0.01}
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 lg:col-span-5 dark:bg-slate-950 dark:ring-slate-800">
            <p className="text-xs text-slate-500">
              {isZh ? "按量 API 预估月花费" : "Estimated API Monthly Cost"}
            </p>
            <p className="mt-1 text-2xl font-extrabold">{formatMoney(apiEstUsd, currency)}</p>
            <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {apiEstUsd < 15
                ? isZh
                  ? `按量 API 更划算！比 $20 会员每月约省 ${formatMoney(20 - apiEstUsd, currency)}。`
                  : `API wins! Saves roughly ${formatMoney(20 - apiEstUsd, currency)}/mo vs a $20 plan.`
                : apiEstUsd <= 22
                  ? isZh
                    ? "接近 $20 临界点，看重官方网页端体验建议直接包月。"
                    : "Right around break-even; pick $20 subscription for convenience."
                  : isZh
                    ? `高频重度用户！$20 包月比纯 API 约省 ${formatMoney(apiEstUsd - 20, currency)}/月。`
                    : `Heavy usage — a $20 subscription saves ~${formatMoney(apiEstUsd - 20, currency)}/mo over API.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
