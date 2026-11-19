"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Download, Globe, Moon, Sun, Upload } from "lucide-react";
import {
  CatalogTool,
  CurrencyCode,
  DealRecord,
  ToolCategory,
  UsageLevel,
  UserSubscription,
  formatMoney,
  getSubMonthlyUsd,
} from "@/lib/catalog";
import { RecommendationPick, runDiagnostics } from "@/lib/diagnostics";
import { downloadRenewalIcs } from "@/lib/exportIcs";
import { CATEGORY_LABELS, Locale } from "@/lib/i18n";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { AuditPanel } from "./AuditPanel";
import { CatalogPicker } from "./CatalogPicker";
import { DealsPanel } from "./DealsPanel";
import { RecommendPanel } from "./RecommendPanel";

const STORAGE_KEY = "ohmymoney_fullstack_v2";

interface Props {
  initialTools: CatalogTool[];
  initialDeals: DealRecord[];
}

export function AppShell({ initialTools, initialDeals }: Props) {
  const [locale, setLocale] = useState<Locale>("zh");
  const [dark, setDark] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [activeTab, setActiveTab] = useState<"dashboard" | "audit" | "recommend" | "deals">(
    "dashboard"
  );
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>(() =>
    initialTools.slice(0, 2).concat(initialTools.filter((t) => t.id === "cursor-pro")).map((t, i) => ({
      ...t,
      billingCycle: "monthly",
      usage: i === 1 ? "medium" : "high",
      renewalDay: 5 + i * 7,
    }))
  );
  const [apiSpendUsd, setApiSpendUsd] = useState(5);
  const [budgetUsd, setBudgetUsd] = useState(50);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [customModalOpen, setCustomModalOpen] = useState(false);

  // Custom subscription form
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<ToolCategory>("chat");
  const [customPrice, setCustomPrice] = useState("15");
  const [customDay, setCustomDay] = useState("1");
  const [customUsage, setCustomUsage] = useState<UsageLevel>("medium");

  const isZh = locale === "zh";

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2800);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.subscriptions)) setSubscriptions(parsed.subscriptions);
        if (typeof parsed.apiSpendUsd === "number") setApiSpendUsd(parsed.apiSpendUsd);
        if (typeof parsed.budgetUsd === "number") setBudgetUsd(parsed.budgetUsd);
        if (parsed.currency) setCurrency(parsed.currency);
        if (parsed.locale) setLocale(parsed.locale);
        if (typeof parsed.dark === "boolean") setDark(parsed.dark);
      }
    } catch {
      // Ignore storage error
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ subscriptions, apiSpendUsd, budgetUsd, currency, locale, dark })
      );
    } catch {
      // Ignore storage error
    }
  }, [subscriptions, apiSpendUsd, budgetUsd, currency, locale, dark, hydrated]);

  const totals = useMemo(() => {
    const subUsd = subscriptions.reduce((s, item) => s + getSubMonthlyUsd(item), 0);
    const totalMonthlyUsd = subUsd + (Number(apiSpendUsd) || 0);
    const byCategoryUsd: Record<string, number> = {};
    subscriptions.forEach((s) => {
      byCategoryUsd[s.category] = (byCategoryUsd[s.category] || 0) + getSubMonthlyUsd(s);
    });
    if (apiSpendUsd > 0) byCategoryUsd.api = apiSpendUsd;

    let topKey = "";
    let topVal = -1;
    Object.entries(byCategoryUsd).forEach(([k, v]) => {
      if (v > topVal) {
        topVal = v;
        topKey = k;
      }
    });
    const topCategoryLabel = topKey
      ? `${CATEGORY_LABELS[locale][topKey] || topKey} (${formatMoney(topVal, currency)})`
      : isZh
        ? "暂无"
        : "None";

    return { subUsd, totalMonthlyUsd, byCategoryUsd, topCategoryLabel };
  }, [subscriptions, apiSpendUsd, locale, currency, isZh]);

  const audit = useMemo(
    () => runDiagnostics(subscriptions, apiSpendUsd, locale),
    [subscriptions, apiSpendUsd, locale]
  );

  function handleToggleTool(tool: CatalogTool) {
    setSubscriptions((prev) => {
      const exists = prev.some((s) => s.id === tool.id);
      if (exists) {
        notify(isZh ? `已移出 ${tool.name}` : `Removed ${tool.nameEn}`);
        return prev.filter((s) => s.id !== tool.id);
      }
      notify(isZh ? `已加入 ${tool.name}` : `Added ${tool.nameEn}`);
      return [
        ...prev,
        {
          ...tool,
          billingCycle: "monthly",
          usage: "medium",
          renewalDay: new Date().getDate(),
        },
      ];
    });
  }

  function handleUpdateSub(id: string, patch: Partial<UserSubscription>) {
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function handleRemoveSub(id: string) {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    notify(isZh ? "已移除该订阅" : "Subscription removed");
  }

  function handleApplyRecommendation(picks: RecommendationPick[]) {
    setSubscriptions(
      picks.map((p) => ({
        ...p.tool,
        priceUsd: p.billingCycle === "monthly" ? p.effectiveUsd : p.tool.priceUsd,
        annualMonthlyUsd: p.billingCycle === "annual" ? p.effectiveUsd : p.tool.annualMonthlyUsd,
        billingCycle: p.billingCycle,
        usage: "high",
        renewalDay: 1,
      }))
    );
    setApiSpendUsd(0);
    setActiveTab("dashboard");
    notify(isZh ? "已套用高性价比推荐组合！" : "Applied recommended stack!");
  }

  function handleExportJson() {
    const blob = new Blob(
      [JSON.stringify({ subscriptions, apiSpendUsd, budgetUsd, currency }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ohmymoney-backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(isZh ? "已导出 JSON 本地备份" : "Exported JSON backup");
  }

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.subscriptions)) throw new Error("Invalid");
        setSubscriptions(parsed.subscriptions);
        if (typeof parsed.apiSpendUsd === "number") setApiSpendUsd(parsed.apiSpendUsd);
        if (typeof parsed.budgetUsd === "number") setBudgetUsd(parsed.budgetUsd);
        notify(isZh ? "已从 JSON 备份恢复账单" : "Restored from JSON backup");
      } catch {
        notify(isZh ? "备份文件格式不正确" : "Invalid backup file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customName.trim()) return;
    const price = Math.max(0, parseFloat(customPrice) || 0);
    const day = Math.min(31, Math.max(1, parseInt(customDay, 10) || 1));
    setSubscriptions((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customName.trim(),
        nameEn: customName.trim(),
        region: "global",
        category: customCategory,
        priceUsd: price,
        annualMonthlyUsd: price,
        nativePriceLabel: `$${price}/mo`,
        noteZh: "自定义订阅",
        noteEn: "Custom subscription",
        sourceUrl: "",
        billingCycle: "monthly",
        usage: customUsage,
        renewalDay: day,
        isCustom: true,
      },
    ]);
    setCustomName("");
    setCustomModalOpen(false);
    notify(isZh ? "已添加自定义订阅" : "Custom subscription added");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Top SaaS Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 font-extrabold text-emerald-400 dark:bg-emerald-500 dark:text-slate-950">
              $
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight">ohmymoney.money</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800">
                  V2 Full-Stack
                </span>
              </div>
              <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
                {isZh
                  ? "AI 订阅算账 · 重叠体检 · 高性价比组合推荐（免登录零摩擦）"
                  : "AI Subscription Cost Tracker, Waste Audit & Smart Bundles"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="USD">USD ($)</option>
              <option value="CNY">CNY (¥)</option>
              <option value="JPY">JPY (¥)</option>
            </select>

            <button
              type="button"
              onClick={() => setLocale(isZh ? "en" : "zh")}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{isZh ? "EN" : "中文"}</span>
            </button>

            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              className="rounded-lg border border-slate-200 bg-white p-1.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() =>
                downloadRenewalIcs(subscriptions, currency)
                  ? notify(isZh ? "已导出 .ics 续费日历" : "Exported .ics calendar")
                  : notify(isZh ? "请先添加订阅" : "Add subscriptions first")
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            >
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">{isZh ? "导出日历" : ".ics"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
              title={isZh ? "导出 JSON 备份" : "Export JSON"}
            >
              <Download className="h-3.5 w-3.5" />
            </button>

            <label
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
              title={isZh ? "导入 JSON 备份" : "Import JSON"}
            >
              <Upload className="h-3.5 w-3.5" />
              <input type="file" accept=".json,application/json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {/* KPI Row */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500">{isZh ? "月均 AI 总支出" : "Monthly Total"}</p>
            <p className="mt-1 text-2xl font-extrabold sm:text-3xl">
              {formatMoney(totals.totalMonthlyUsd, currency)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {isZh ? "订阅" : "Subs"} {formatMoney(totals.subUsd, currency)} + API{" "}
              {formatMoney(apiSpendUsd, currency)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500">{isZh ? "年化总支出" : "Annualized"}</p>
            <p className="mt-1 text-2xl font-extrabold sm:text-3xl">
              {formatMoney(totals.totalMonthlyUsd * 12, currency)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {isZh ? "按当前方案折算 12 个月" : "12-month projection"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500">{isZh ? "在用订阅数" : "Active Tools"}</p>
            <p className="mt-1 text-2xl font-extrabold sm:text-3xl">{subscriptions.length}</p>
            <p
              className={`mt-1 text-[11px] font-semibold ${
                totals.totalMonthlyUsd > budgetUsd ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {totals.totalMonthlyUsd > budgetUsd
                ? isZh
                  ? `超预算 ${formatMoney(totals.totalMonthlyUsd - budgetUsd, currency)}`
                  : `Over by ${formatMoney(totals.totalMonthlyUsd - budgetUsd, currency)}`
                : isZh
                  ? "预算健康"
                  : "Within budget"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 text-left shadow-sm transition hover:border-emerald-300 dark:border-emerald-900 dark:from-emerald-950/60 dark:to-slate-900"
          >
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {isZh ? "体检潜在可省 / 月" : "Potential Savings / Mo"}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700 sm:text-3xl dark:text-emerald-400">
              {formatMoney(audit.totalSaveUsd, currency)}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              {isZh ? `查看 ${audit.issues.length} 条诊断 →` : `View ${audit.issues.length} insights →`}
            </p>
          </button>
        </section>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {(
            [
              { id: "dashboard", zh: "1. 账单与数据看板", en: "1. Dashboard & Analytics" },
              { id: "audit", zh: `2. 体检与晒单 (${audit.issues.length})`, en: `2. Audit & PNG (${audit.issues.length})` },
              { id: "recommend", zh: "3. 性价比推荐", en: "3. Smart Bundles" },
              { id: "deals", zh: "4. 省钱情报站", en: "4. Deals & Tips" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${
                activeTab === t.id
                  ? "bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {isZh ? t.zh : t.en}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <AnalyticsCharts
              locale={locale}
              currency={currency}
              byCategoryUsd={totals.byCategoryUsd}
              monthlyTotalUsd={totals.totalMonthlyUsd}
              savingsUsd={audit.totalSaveUsd}
              budgetUsd={budgetUsd}
            />

            {/* API & Budget Sliders */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex justify-between text-xs font-bold">
                  <span>{isZh ? "API 按量估算 / 月 (USD)" : "Pay-as-You-Go API / Mo (USD)"}</span>
                  <span>{formatMoney(apiSpendUsd, currency)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={150}
                  step={1}
                  value={Math.min(150, apiSpendUsd)}
                  onChange={(e) => setApiSpendUsd(Number(e.target.value))}
                  className="mt-3 w-full"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex justify-between text-xs font-bold">
                  <span>{isZh ? "每月 AI 预算上限 (USD)" : "Monthly AI Budget Cap (USD)"}</span>
                  <span className="text-emerald-600">{formatMoney(budgetUsd, currency)}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={5}
                  value={Math.min(200, budgetUsd)}
                  onChange={(e) => setBudgetUsd(Number(e.target.value))}
                  className="mt-3 w-full"
                />
              </div>
            </div>

            <CatalogPicker
              locale={locale}
              currency={currency}
              catalog={initialTools}
              subscriptions={subscriptions}
              onToggleTool={handleToggleTool}
              onUpdateSub={handleUpdateSub}
              onRemoveSub={handleRemoveSub}
              onOpenCustom={() => setCustomModalOpen(true)}
            />
          </div>
        )}

        {activeTab === "audit" && (
          <AuditPanel
            locale={locale}
            currency={currency}
            subscriptions={subscriptions}
            apiSpendUsd={apiSpendUsd}
            budgetUsd={budgetUsd}
            monthlyTotalUsd={totals.totalMonthlyUsd}
            topCategoryLabel={totals.topCategoryLabel}
            audit={audit}
            onRemoveSub={handleRemoveSub}
            onSwitchAnnual={(id) => {
              handleUpdateSub(id, { billingCycle: "annual" });
              notify(isZh ? "已切换为年付折算价" : "Switched to annual billing");
            }}
            onToast={notify}
          />
        )}

        {activeTab === "recommend" && (
          <RecommendPanel
            locale={locale}
            currency={currency}
            catalog={initialTools}
            currentMonthlyUsd={totals.totalMonthlyUsd}
            onApplyRecommendation={handleApplyRecommendation}
          />
        )}

        {activeTab === "deals" && (
          <DealsPanel locale={locale} deals={initialDeals} onToast={notify} />
        )}
      </main>

      {/* Custom Subscription Modal */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-bold">
              {isZh ? "添加自定义 AI 订阅" : "Add Custom AI Subscription"}
            </h3>
            <form onSubmit={handleAddCustom} className="mt-4 space-y-3">
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={isZh ? "工具名称（如 智谱清言 / Poe）" : "Tool name"}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as ToolCategory)}
                  className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                >
                  {(["chat", "search", "coding", "visual", "audio"] as const).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[locale][c]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="USD / mo"
                  className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={customDay}
                  onChange={(e) => setCustomDay(e.target.value)}
                  placeholder={isZh ? "续费日 (1-31)" : "Renewal day"}
                  className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                />
                <select
                  value={customUsage}
                  onChange={(e) => setCustomUsage(e.target.value as UsageLevel)}
                  className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                >
                  <option value="high">{isZh ? "高频刚需" : "Heavy"}</option>
                  <option value="medium">{isZh ? "中频常用" : "Regular"}</option>
                  <option value="low">{isZh ? "低频闲置" : "Rarely used"}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold dark:border-slate-700"
                >
                  {isZh ? "取消" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-emerald-500 dark:text-slate-950"
                >
                  {isZh ? "加入账单" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-emerald-500 dark:text-slate-950">
          {toast}
        </div>
      )}
    </div>
  );
}
