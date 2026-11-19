"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Calendar,
  Download,
  Moon,
  MoreHorizontal,
  Sun,
  Upload,
  Zap,
} from "lucide-react";
import {
  CURRENCY_META,
  BillingCycle,
  CatalogTool,
  CurrencyCode,
  DealRecord,
  ToolCategory,
  UsageLevel,
  UserSubscription,
  formatMoney,
  fromCurrencyToUsd,
  getSubMonthlyUsd,
  setLiveCurrencyRates,
} from "@/lib/catalog";
import { RecommendationPick, runDiagnostics } from "@/lib/diagnostics";
import { downloadRenewalIcs } from "@/lib/exportIcs";
import { CATEGORY_LABELS, Locale } from "@/lib/i18n";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { AuditPanel } from "./AuditPanel";
import { CatalogPicker } from "./CatalogPicker";
import { DealsPanel } from "./DealsPanel";
import { RecommendPanel } from "./RecommendPanel";

const STORAGE_KEY = "ohmymoney_fullstack_v3";
const RATES_CACHE_KEY = "ohmymoney_fx_rates_v1";

type AppTab = "setup" | "dashboard" | "audit" | "recommend" | "deals";

interface Props {
  initialTools: CatalogTool[];
  initialDeals: DealRecord[];
}

function daysUntilRenewal(renewalDay: number): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const clampedDay = Math.min(28, Math.max(1, renewalDay || 1));
  let target = new Date(now.getFullYear(), now.getMonth(), clampedDay);
  if (target < today) {
    target = new Date(now.getFullYear(), now.getMonth() + 1, clampedDay);
  }
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function AppShell({ initialTools, initialDeals }: Props) {
  const [locale, setLocale] = useState<Locale>("zh");
  const [dark, setDark] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [rateTick, setRateTick] = useState(0);
  const [activeTab, setActiveTab] = useState<AppTab>("setup");
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [apiSpendUsd, setApiSpendUsd] = useState(0);
  const [budgetUsd, setBudgetUsd] = useState(50);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Custom subscription form (in currently selected currency)
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<ToolCategory>("chat");
  const [customCycle, setCustomCycle] = useState<BillingCycle>("monthly");
  const [customPrice, setCustomPrice] = useState("20");
  const [customDay, setCustomDay] = useState("1");
  const [customUsage, setCustomUsage] = useState<UsageLevel>("high");

  const isZh = locale === "zh";
  const curMeta = CURRENCY_META[currency];

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2800);
  }

  // Close custom subscription modal on Escape key
  useEffect(() => {
    if (!customModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCustomModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [customModalOpen]);

  // Load saved local state
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

  // Fetch live FX rates with 24h localStorage cache
  useEffect(() => {
    let cancelled = false;
    async function loadRates() {
      try {
        const cached = localStorage.getItem(RATES_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as { ts: number; rates: Record<string, number> };
          if (Date.now() - parsed.ts < 86400 * 1000 && parsed.rates) {
            setLiveCurrencyRates(parsed.rates);
            if (!cancelled) setRateTick((t) => t + 1);
            return;
          }
        }
      } catch {
        // Ignore cache error
      }
      try {
        const res = await fetch("/api/rates");
        if (!res.ok) return;
        const data = (await res.json()) as { rates?: Record<string, number> };
        if (data.rates) {
          setLiveCurrencyRates(data.rates);
          try {
            localStorage.setItem(
              RATES_CACHE_KEY,
              JSON.stringify({ ts: Date.now(), rates: data.rates })
            );
          } catch {
            // Ignore storage error
          }
          if (!cancelled) setRateTick((t) => t + 1);
        }
      } catch {
        // Use built-in fallback rates silently
      }
    }
    loadRates();
    return () => {
      cancelled = true;
    };
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
    void rateTick;
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

    const sortedByCost = [...subscriptions].sort(
      (a, b) => getSubMonthlyUsd(b) - getSubMonthlyUsd(a)
    );

    const upcomingRenewals = subscriptions
      .filter((s) => getSubMonthlyUsd(s) > 0)
      .map((s) => ({ sub: s, days: daysUntilRenewal(s.renewalDay) }))
      .filter((x) => x.days <= 7)
      .sort((a, b) => a.days - b.days);

    return { subUsd, totalMonthlyUsd, byCategoryUsd, topCategoryLabel, sortedByCost, upcomingRenewals };
  }, [subscriptions, apiSpendUsd, locale, currency, isZh, rateTick]);

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

  function handleClearAll() {
    setSubscriptions([]);
    setApiSpendUsd(0);
    notify(isZh ? "已清空所有已选订阅" : "Cleared all subscriptions");
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

  function handleExportIcs() {
    setMobileMenuOpen(false);
    if (downloadRenewalIcs(subscriptions, currency)) {
      notify(isZh ? "已导出 .ics 续费日历" : "Exported .ics calendar");
    } else {
      notify(isZh ? "请先添加订阅" : "Add subscriptions first");
    }
  }

  function handleExportJson() {
    setMobileMenuOpen(false);
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
    setMobileMenuOpen(false);
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
    const enteredVal = Math.max(0, parseFloat(customPrice) || 0);
    const monthlyLocal = customCycle === "annual" ? enteredVal / 12 : enteredVal;
    const monthlyUsd = fromCurrencyToUsd(monthlyLocal, currency);
    const day = Math.min(28, Math.max(1, parseInt(customDay, 10) || 1));
    setSubscriptions((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customName.trim(),
        nameEn: customName.trim(),
        region: "global",
        category: customCategory,
        priceUsd: monthlyUsd,
        annualMonthlyUsd: monthlyUsd,
        nativePriceLabel:
          customCycle === "annual"
            ? `${curMeta.symbol}${enteredVal}/yr`
            : `${curMeta.symbol}${enteredVal}/mo`,
        noteZh: "自定义订阅",
        noteEn: "Custom subscription",
        sourceUrl: "",
        billingCycle: customCycle,
        usage: customUsage,
        renewalDay: day,
        isCustom: true,
      },
    ]);
    setCustomName("");
    setCustomModalOpen(false);
    notify(isZh ? "已添加自定义订阅" : "Custom subscription added");
  }

  const budgetPct = budgetUsd > 0 ? Math.round((totals.totalMonthlyUsd / budgetUsd) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FFF8E7] text-black transition-colors dark:bg-[#121216] dark:text-[#FFF8E7]">
      {/* Neo-Brutalism Top Bar */}
      <header className="sticky top-0 z-30 border-b-[2.5px] border-black bg-[#FFF8E7]/95 backdrop-blur dark:border-zinc-200 dark:bg-[#121216]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="brutal-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFE500] font-mono text-base font-black text-black sm:h-10 sm:w-10 sm:text-lg">
              $
            </div>
            <div>
              <span className="font-display text-base font-extrabold tracking-tight sm:text-lg">
                OhMyMoney
              </span>
              <p className="hidden text-xs font-medium text-zinc-700 md:block dark:text-zinc-300">
                {isZh
                  ? "AI 订阅算账 · 高性价比搭配 · 省钱情报"
                  : "AI Spend Tracker · Smart Bundles · Verified Deals"}
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-1.5 sm:gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              aria-label="Currency"
              className="brutal-btn rounded-xl bg-white px-2 py-1.5 text-xs font-extrabold text-black outline-none sm:px-2.5 dark:bg-zinc-900 dark:text-white"
            >
              <option value="USD">USD ($)</option>
              <option value="CNY">CNY (¥)</option>
              <option value="JPY">JPY (¥)</option>
            </select>

            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              aria-label="Language"
              className="brutal-btn rounded-xl bg-white px-2 py-1.5 text-xs font-extrabold text-black outline-none sm:px-2.5 dark:bg-zinc-900 dark:text-white"
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>

            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              className="brutal-btn rounded-xl bg-white p-1.5 text-black hover:bg-[#FFE500] dark:bg-zinc-900 dark:text-[#FFE500]"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Desktop Utility Actions */}
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={handleExportIcs}
                className="brutal-btn inline-flex items-center gap-1 rounded-xl bg-[#00E599] px-3 py-1.5 text-xs font-extrabold text-black hover:bg-emerald-300"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>{isZh ? "导出日历" : ".ics"}</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="brutal-btn inline-flex items-center gap-1 rounded-xl bg-white p-1.5 text-black hover:bg-[#FFE500] dark:bg-zinc-900 dark:text-white dark:hover:text-black"
                title={isZh ? "导出 JSON 备份" : "Export JSON"}
              >
                <Download className="h-4 w-4" />
              </button>

              <label
                className="brutal-btn inline-flex cursor-pointer items-center gap-1 rounded-xl bg-white p-1.5 text-black hover:bg-[#FFE500] dark:bg-zinc-900 dark:text-white dark:hover:text-black"
                title={isZh ? "导入 JSON 备份" : "Import JSON"}
              >
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>

            {/* Mobile Collapsible "More" Menu */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="brutal-btn rounded-xl bg-[#00E599] p-1.5 text-black sm:hidden"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {mobileMenuOpen && (
              <div className="brutal-card absolute right-0 top-12 z-50 flex w-44 flex-col gap-1.5 p-2 sm:hidden">
                <button
                  type="button"
                  onClick={handleExportIcs}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-extrabold hover:bg-[#FFE500] dark:hover:text-black"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{isZh ? "导出 .ics 日历" : "Export .ics"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-extrabold hover:bg-[#FFE500] dark:hover:text-black"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isZh ? "导出 JSON 备份" : "Export JSON"}</span>
                </button>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-extrabold hover:bg-[#FFE500] dark:hover:text-black">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isZh ? "导入 JSON 备份" : "Import JSON"}</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportJson}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {/* Pop-Art KPI Sticker Row */}
        <section className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
          <div className="brutal-card bg-[#FFE500] p-4 text-black dark:bg-[#FFE500] dark:text-black">
            <p className="text-xs font-extrabold uppercase tracking-wide">
              {isZh ? "月均 AI 总支出" : "Monthly Total"}
            </p>
            <p className="mt-1 font-mono text-2xl font-black sm:text-3xl">
              {formatMoney(totals.totalMonthlyUsd, currency)}
            </p>
            <p className="mt-1 text-[11px] font-bold opacity-80">
              {isZh ? "订阅" : "Subs"} {formatMoney(totals.subUsd, currency)} + API{" "}
              {formatMoney(apiSpendUsd, currency)}
            </p>
          </div>

          <div className="brutal-card bg-white p-4 dark:bg-[#1B1B22]">
            <p className="text-xs font-extrabold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              {isZh ? "年化总支出" : "Annualized"}
            </p>
            <p className="mt-1 font-mono text-2xl font-black sm:text-3xl">
              {formatMoney(totals.totalMonthlyUsd * 12, currency)}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              {isZh ? "按当前方案折算 12 个月" : "12-month projection"}
            </p>
          </div>

          <div className="brutal-card bg-[#3B82F6] p-4 text-white dark:bg-[#3B82F6]">
            <p className="text-xs font-extrabold uppercase tracking-wide text-white/90">
              {isZh ? "在用订阅数" : "Active Tools"}
            </p>
            <p className="mt-1 font-mono text-2xl font-black sm:text-3xl">{subscriptions.length}</p>
            <p className="mt-1 inline-block rounded border border-black bg-white px-1.5 py-0.5 text-[10px] font-black text-black">
              {subscriptions.length === 0 && apiSpendUsd === 0
                ? isZh
                  ? "暂未勾选订阅"
                  : "No tools selected"
                : totals.totalMonthlyUsd > budgetUsd
                  ? isZh
                    ? `超预算 ${formatMoney(totals.totalMonthlyUsd - budgetUsd, currency)}`
                    : `Over by ${formatMoney(totals.totalMonthlyUsd - budgetUsd, currency)}`
                  : isZh
                    ? "预算健康 ✓"
                    : "Within budget ✓"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className="brutal-card bg-[#FF5C5C] p-4 text-left text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 dark:bg-[#FF5C5C]"
          >
            <p className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide">
              <Zap className="h-3.5 w-3.5 fill-[#FFE500] text-[#FFE500]" />
              <span>{isZh ? "体检潜在可省 / 月" : "Potential Savings"}</span>
            </p>
            <p className="mt-1 font-mono text-2xl font-black sm:text-3xl">
              {formatMoney(audit.totalSaveUsd, currency)}
            </p>
            <p className="mt-1 text-[11px] font-extrabold text-[#FFE500]">
              {isZh ? `查看 ${audit.issues.length} 条诊断 →` : `View ${audit.issues.length} insights →`}
            </p>
          </button>
        </section>

        {/* 5-Tab Pop Navigation Bar */}
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {(
            [
              { id: "setup", zh: "1. 我的订阅配置", en: "1. My Subscriptions" },
              { id: "dashboard", zh: "2. 账单与数据看板", en: "2. Spend Dashboard" },
              {
                id: "audit",
                zh: `3. 体检与晒单 (${audit.issues.length})`,
                en: `3. Audit & PNG (${audit.issues.length})`,
              },
              { id: "recommend", zh: "4. 性价比搭配推荐", en: "4. Smart Bundles" },
              { id: "deals", zh: "5. 省钱情报站", en: "5. Deals & Tips" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`brutal-btn rounded-xl px-3 py-2.5 text-xs font-extrabold sm:text-sm ${
                activeTab === t.id
                  ? "bg-black text-[#FFE500] dark:bg-[#FFE500] dark:text-black"
                  : "bg-white text-black hover:bg-[#FFE500]/40 dark:bg-[#1B1B22] dark:text-white"
              }`}
            >
              {isZh ? t.zh : t.en}
            </button>
          ))}
        </nav>

        {/* TAB 1: MY SUBSCRIPTIONS SETUP */}
        {activeTab === "setup" && (
          <div className="space-y-6">
            <CatalogPicker
              locale={locale}
              currency={currency}
              catalog={initialTools}
              subscriptions={subscriptions}
              onToggleTool={handleToggleTool}
              onUpdateSub={handleUpdateSub}
              onRemoveSub={handleRemoveSub}
              onClearAll={handleClearAll}
              onOpenCustom={() => {
                setCustomPrice(String(Math.round(15 * curMeta.rate)));
                setCustomModalOpen(true);
              }}
            />

            {/* API & Budget Sliders */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="brutal-card p-5">
                <div className="flex justify-between text-xs font-extrabold">
                  <span>
                    {isZh
                      ? `API 按量估算 / 月 (${currency})`
                      : `Pay-as-You-Go API / Mo (${currency})`}
                  </span>
                  <span className="rounded border-2 border-black bg-[#FFE500] px-2 py-0.5 font-mono text-black">
                    {formatMoney(apiSpendUsd, currency)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={150}
                  step={1}
                  value={Math.min(150, apiSpendUsd)}
                  onChange={(e) => setApiSpendUsd(Number(e.target.value))}
                  className="mt-3.5 w-full"
                />
              </div>

              <div className="brutal-card p-5">
                <div className="flex justify-between text-xs font-extrabold">
                  <span>
                    {isZh ? `每月 AI 预算上限 (${currency})` : `Monthly AI Budget Cap (${currency})`}
                  </span>
                  <span className="rounded border-2 border-black bg-[#00E599] px-2 py-0.5 font-mono text-black">
                    {formatMoney(budgetUsd, currency)}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={5}
                  value={Math.min(200, budgetUsd)}
                  onChange={(e) => setBudgetUsd(Number(e.target.value))}
                  className="mt-3.5 w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PURE SPEND DASHBOARD & ANALYTICS */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {subscriptions.length === 0 && apiSpendUsd === 0 ? (
              <div className="brutal-card flex flex-col items-center justify-center gap-3 p-10 text-center">
                <p className="font-display text-lg font-extrabold">
                  {isZh ? "还没有勾选任何 AI 订阅" : "No AI subscriptions selected yet"}
                </p>
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {isZh
                    ? "先去「1. 我的订阅配置」勾选你在用的工具，这里会自动生成账单占比与年度预测看板。"
                    : "Head to Tab 1 to pick your active AI tools and unlock your spend dashboard."}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("setup")}
                  className="brutal-btn mt-2 rounded-xl bg-[#FFE500] px-5 py-2.5 text-xs font-black text-black"
                >
                  {isZh ? "前往勾选我的订阅 →" : "Select My Subscriptions →"}
                </button>
              </div>
            ) : (
              <>
                {/* Upcoming 7-Day Renewal Alert Banner */}
                {totals.upcomingRenewals.length > 0 && (
                  <div className="brutal-card flex flex-wrap items-center justify-between gap-3 bg-[#FFE500] p-4 text-black dark:bg-[#FFE500] dark:text-black">
                    <div className="flex items-start gap-2.5">
                      <BellRing className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-display text-sm font-black">
                          {isZh
                            ? `未来 7 天内有 ${totals.upcomingRenewals.length} 项即将自动扣费`
                            : `${totals.upcomingRenewals.length} subscription(s) renewing within 7 days`}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {totals.upcomingRenewals.map(({ sub, days }) => (
                            <span
                              key={sub.id}
                              className="rounded-md border-2 border-black bg-white px-2 py-0.5 text-[11px] font-extrabold"
                            >
                              {isZh ? sub.name : sub.nameEn} ·{" "}
                              {days === 0
                                ? isZh
                                  ? "今天扣费"
                                  : "Today"
                                : isZh
                                  ? `${days} 天后`
                                  : `in ${days}d`}{" "}
                              ({formatMoney(getSubMonthlyUsd(sub), currency)})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportIcs}
                      className="brutal-btn rounded-xl bg-black px-3.5 py-2 text-xs font-extrabold text-[#FFE500]"
                    >
                      {isZh ? "导出日历提醒" : "Export .ics"}
                    </button>
                  </div>
                )}

                {/* Budget & Top Spend Overview */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="brutal-card p-5 lg:col-span-7">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="font-display text-base font-extrabold">
                          {isZh ? "月度预算使用率" : "Monthly Budget Utilization"}
                        </h2>
                        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                          {isZh
                            ? `当前支出 ${formatMoney(totals.totalMonthlyUsd, currency)} / 预算上限 ${formatMoney(budgetUsd, currency)} · 最大开销：${totals.topCategoryLabel}`
                            : `${formatMoney(totals.totalMonthlyUsd, currency)} of ${formatMoney(budgetUsd, currency)} cap · Top: ${totals.topCategoryLabel}`}
                        </p>
                      </div>
                      <span
                        className={`rounded-lg border-2 border-black px-3 py-1 font-mono text-xs font-black ${
                          budgetPct > 100
                            ? "bg-[#FF5C5C] text-white"
                            : budgetPct >= 80
                              ? "bg-[#FFE500] text-black"
                              : "bg-[#00E599] text-black"
                        }`}
                      >
                        {budgetPct}%
                      </span>
                    </div>
                    <div className="mt-3.5 h-4 w-full overflow-hidden rounded-full border-2 border-black bg-[#FFF8E7]">
                      <div
                        className={`h-full transition-all duration-300 ${
                          budgetPct > 100
                            ? "bg-[#FF5C5C]"
                            : budgetPct >= 80
                              ? "bg-[#FFE500]"
                              : "bg-[#00E599]"
                        }`}
                        style={{ width: `${Math.min(100, budgetPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="brutal-card p-5 lg:col-span-5">
                    <h2 className="font-display text-base font-extrabold">
                      {isZh ? "支出排行 Top 订阅" : "Top Subscriptions"}
                    </h2>
                    <div className="mt-3 space-y-2">
                      {totals.sortedByCost.slice(0, 3).map((s, idx) => (
                        <div key={s.id} className="flex items-center justify-between text-xs">
                          <span className="font-bold">
                            #{idx + 1} {isZh ? s.name : s.nameEn}
                          </span>
                          <span className="font-mono font-black">
                            {formatMoney(getSubMonthlyUsd(s), currency)}/{isZh ? "月" : "mo"}
                          </span>
                        </div>
                      ))}
                      {apiSpendUsd > 0 && (
                        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                          <span className="font-bold">{isZh ? "API 按量估算" : "API Spend"}</span>
                          <span className="font-mono font-black">
                            {formatMoney(apiSpendUsd, currency)}/{isZh ? "月" : "mo"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <AnalyticsCharts
                  locale={locale}
                  currency={currency}
                  byCategoryUsd={totals.byCategoryUsd}
                  monthlyTotalUsd={totals.totalMonthlyUsd}
                  savingsUsd={audit.totalSaveUsd}
                  budgetUsd={budgetUsd}
                />
              </>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT & PNG */}
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

        {/* TAB 4: SMART BUNDLES */}
        {activeTab === "recommend" && (
          <RecommendPanel
            locale={locale}
            currency={currency}
            catalog={initialTools}
            currentMonthlyUsd={totals.totalMonthlyUsd}
            onApplyRecommendation={handleApplyRecommendation}
          />
        )}

        {/* TAB 5: DEALS */}
        {activeTab === "deals" && (
          <DealsPanel locale={locale} deals={initialDeals} onToast={notify} />
        )}
      </main>

      {/* Custom Subscription Modal (Currency-Aware, Labeled) */}
      {customModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCustomModalOpen(false);
          }}
        >
          <div className="brutal-card w-full max-w-lg overflow-hidden rounded-2xl bg-[#FFF8E7] text-black dark:bg-[#1B1B22] dark:text-white">
            <div className="flex items-center justify-between border-b-[2.5px] border-black bg-[#FFE500] px-5 py-3.5 text-black">
              <div>
                <h3 className="font-display text-base font-black">
                  {isZh ? "添加自定义 AI 订阅" : "Add Custom AI Subscription"}
                </h3>
                <p className="text-[11px] font-bold opacity-80">
                  {isZh
                    ? "价格库未收录的工具或企业/合租定制价可在此补充"
                    : "Add any unlisted AI tool or custom team/shared price"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setCustomModalOpen(false)}
                className="brutal-btn flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-black text-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustom} className="space-y-3.5 p-5">
              <div>
                <label className="mb-1 block text-xs font-extrabold">
                  {isZh ? "工具 / 档位名称 *" : "Tool / Plan Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={isZh ? "如：Poe 会员 / Notion AI / 团队合租" : "e.g., Poe / Notion AI / Team seat"}
                  className="w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:ring-2 focus:ring-[#FFE500] dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-extrabold">
                    {isZh ? "所属分类" : "Category"}
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as ToolCategory)}
                    className="w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black outline-none dark:bg-zinc-900 dark:text-white"
                  >
                    {(["chat", "search", "coding", "visual", "audio"] as const).map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[locale][c]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-extrabold">
                    {isZh ? "计费周期" : "Billing Cycle"}
                  </label>
                  <select
                    value={customCycle}
                    onChange={(e) => setCustomCycle(e.target.value as BillingCycle)}
                    className="w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black outline-none dark:bg-zinc-900 dark:text-white"
                  >
                    <option value="monthly">{isZh ? "按月付费" : "Monthly"}</option>
                    <option value="annual">{isZh ? "按年付费" : "Annual"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-extrabold">
                    {customCycle === "annual"
                      ? isZh
                        ? `每年总价 (${currency} ${curMeta.symbol})`
                        : `Annual Total (${currency} ${curMeta.symbol})`
                      : isZh
                        ? `每月价格 (${currency} ${curMeta.symbol})`
                        : `Monthly Price (${currency} ${curMeta.symbol})`}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={curMeta.decimals === 0 ? 1 : 0.01}
                    required
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full rounded-xl border-2 border-black bg-white px-3 py-2 font-mono text-sm font-bold text-black outline-none focus:ring-2 focus:ring-[#FFE500] dark:bg-zinc-900 dark:text-white"
                  />
                  <p className="mt-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                    {(() => {
                      const raw = Math.max(0, parseFloat(customPrice) || 0);
                      const moUsd = fromCurrencyToUsd(customCycle === "annual" ? raw / 12 : raw, currency);
                      return customCycle === "annual"
                        ? isZh
                          ? `折合月均约 ${formatMoney(moUsd, currency)} / 月`
                          : `≈ ${formatMoney(moUsd, currency)} / mo`
                        : isZh
                          ? `年化约 ${formatMoney(moUsd * 12, currency)} / 年`
                          : `≈ ${formatMoney(moUsd * 12, currency)} / yr`;
                    })()}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-extrabold">
                    {isZh ? "使用频率（用于重叠体检）" : "Usage Frequency"}
                  </label>
                  <select
                    value={customUsage}
                    onChange={(e) => setCustomUsage(e.target.value as UsageLevel)}
                    className="w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black outline-none dark:bg-zinc-900 dark:text-white"
                  >
                    <option value="high">{isZh ? "高频主力" : "Daily / Heavy"}</option>
                    <option value="medium">{isZh ? "中频常用" : "Weekly / Moderate"}</option>
                    <option value="low">{isZh ? "低频偶尔" : "Rarely Used"}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-extrabold">
                  {isZh ? "每月续费日（1–28 号，用于到期提醒）" : "Renewal Day (1–28, for alerts)"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={customDay}
                  onChange={(e) => setCustomDay(e.target.value)}
                  className="w-full rounded-xl border-2 border-black bg-white px-3 py-2 font-mono text-sm font-bold text-black outline-none sm:w-40 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 border-t-2 border-black/15 pt-3.5">
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(false)}
                  className="brutal-btn rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-black"
                >
                  {isZh ? "取消" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="brutal-btn rounded-xl bg-[#00E599] px-5 py-2 text-xs font-black text-black"
                >
                  {isZh ? "确认加入账单" : "Add to Stack"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop Toast */}
      {toast && (
        <div className="brutal-btn fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#FFE500] px-5 py-2.5 text-xs font-black text-black">
          {toast}
        </div>
      )}
    </div>
  );
}
