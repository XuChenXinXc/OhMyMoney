"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CURRENCY_META, CurrencyCode, formatMoney } from "@/lib/catalog";
import { CATEGORY_LABELS, Locale } from "@/lib/i18n";

const CATEGORY_COLORS: Record<string, string> = {
  chat: "#0f172a",
  search: "#0ea5e9",
  coding: "#10b981",
  visual: "#f59e0b",
  audio: "#8b5cf6",
  api: "#64748b",
};

interface Props {
  locale: Locale;
  currency: CurrencyCode;
  byCategoryUsd: Record<string, number>;
  monthlyTotalUsd: number;
  savingsUsd: number;
  budgetUsd: number;
}

export function AnalyticsCharts({
  locale,
  currency,
  byCategoryUsd,
  monthlyTotalUsd,
  savingsUsd,
  budgetUsd,
}: Props) {
  const isZh = locale === "zh";
  const rate = CURRENCY_META[currency].rate;
  const labels = CATEGORY_LABELS[locale];

  const pieData = Object.entries(byCategoryUsd)
    .filter(([, v]) => v > 0)
    .map(([key, usd]) => ({
      key,
      name: labels[key] || key,
      value: Number((usd * rate).toFixed(2)),
      usd,
    }));

  const optimizedUsd = Math.max(0, monthlyTotalUsd - savingsUsd);
  const compareData = [
    {
      name: isZh ? "当前月支出" : "Current",
      amount: Number((monthlyTotalUsd * rate).toFixed(2)),
      fill: "#0f172a",
    },
    {
      name: isZh ? "优化后预估" : "Optimized",
      amount: Number((optimizedUsd * rate).toFixed(2)),
      fill: "#10b981",
    },
    {
      name: isZh ? "预算上限" : "Budget",
      amount: Number((budgetUsd * rate).toFixed(2)),
      fill: "#64748b",
    },
  ];

  const projectionData = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    return {
      month: isZh ? `${m}月` : `M${m}`,
      current: Number((monthlyTotalUsd * m * rate).toFixed(0)),
      optimized: Number((optimizedUsd * m * rate).toFixed(0)),
    };
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Donut Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">{isZh ? "各类别支出占比" : "Spend by Category"}</h3>
          <span className="text-xs font-semibold text-slate-500">
            {formatMoney(monthlyTotalUsd, currency)}/{isZh ? "月" : "mo"}
          </span>
        </div>
        <div className="mt-3 h-56 w-full">
          {pieData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              {isZh ? "勾选工具后展示分布" : "Select tools to view chart"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={CATEGORY_COLORS[entry.key] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => `${CURRENCY_META[currency].symbol}${v.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {pieData.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[item.key] || "#94a3b8" }}
              />
              {item.name}
            </span>
          ))}
        </div>
      </div>

      {/* Current vs Optimized vs Budget Bar Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold">
          {isZh ? "当前 vs 优化后 vs 预算" : "Current vs Optimized vs Budget"}
        </h3>
        <div className="mt-3 h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => `${CURRENCY_META[currency].symbol}${v.toLocaleString()}`}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {compareData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 12-Month Cumulative Projection Area Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">
            {isZh ? "12 个月累计支出预测" : "12-Month Cumulative Projection"}
          </h3>
          <span className="text-[11px] font-semibold text-emerald-600">
            {isZh ? "年省 " : "Save "}
            {formatMoney(savingsUsd * 12, currency)}
          </span>
        </div>
        <div className="mt-3 h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => `${CURRENCY_META[currency].symbol}${v.toLocaleString()}`}
              />
              <Area
                type="monotone"
                dataKey="current"
                name={isZh ? "当前累计" : "Current"}
                stroke="#64748b"
                fill="#cbd5e1"
                fillOpacity={0.35}
              />
              <Area
                type="monotone"
                dataKey="optimized"
                name={isZh ? "优化后累计" : "Optimized"}
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.25}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
