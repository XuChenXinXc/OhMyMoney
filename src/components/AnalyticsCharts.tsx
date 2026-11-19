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
  chat: "#000000",
  search: "#3B82F6",
  coding: "#00E599",
  visual: "#FFE500",
  audio: "#FF5C5C",
  api: "#A855F7",
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
      fill: "#FF5C5C",
    },
    {
      name: isZh ? "优化后预估" : "Optimized",
      amount: Number((optimizedUsd * rate).toFixed(2)),
      fill: "#00E599",
    },
    {
      name: isZh ? "预算上限" : "Budget",
      amount: Number((budgetUsd * rate).toFixed(2)),
      fill: "#3B82F6",
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
      <div className="brutal-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-extrabold">
            {isZh ? "各类别支出占比" : "Spend by Category"}
          </h3>
          <span className="rounded border-2 border-black bg-[#FFE500] px-2 py-0.5 font-mono text-[11px] font-black text-black">
            {formatMoney(monthlyTotalUsd, currency)}/{isZh ? "月" : "mo"}
          </span>
        </div>
        <div className="mt-3 h-56 w-full">
          {pieData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs font-bold text-zinc-400">
              {isZh ? "勾选工具后展示分布" : "Select tools to view chart"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="#000000"
                  strokeWidth={2}
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
              className="inline-flex items-center gap-1.5 text-[11px] font-bold"
            >
              <span
                className="h-3 w-3 rounded-sm border border-black"
                style={{ backgroundColor: CATEGORY_COLORS[item.key] || "#94a3b8" }}
              />
              {item.name}
            </span>
          ))}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="brutal-card p-5">
        <h3 className="font-display text-sm font-extrabold">
          {isZh ? "当前 vs 优化后 vs 预算" : "Current vs Optimized vs Budget"}
        </h3>
        <div className="mt-3 h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d4d4d8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => `${CURRENCY_META[currency].symbol}${v.toLocaleString()}`}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]} stroke="#000000" strokeWidth={2}>
                {compareData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 12-Month Area Chart */}
      <div className="brutal-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-extrabold">
            {isZh ? "12 个月累计支出预测" : "12-Month Projection"}
          </h3>
          <span className="rounded border-2 border-black bg-[#00E599] px-2 py-0.5 font-mono text-[11px] font-black text-black">
            {isZh ? "年省 " : "Save "}
            {formatMoney(savingsUsd * 12, currency)}
          </span>
        </div>
        <div className="mt-3 h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d4d4d8" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => `${CURRENCY_META[currency].symbol}${v.toLocaleString()}`}
              />
              <Area
                type="monotone"
                dataKey="current"
                name={isZh ? "当前累计" : "Current"}
                stroke="#FF5C5C"
                strokeWidth={2.5}
                fill="#FF5C5C"
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="optimized"
                name={isZh ? "优化后累计" : "Optimized"}
                stroke="#000000"
                strokeWidth={2.5}
                fill="#00E599"
                fillOpacity={0.45}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
