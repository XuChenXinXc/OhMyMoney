"use client";

import { useState } from "react";
import { ExternalLink, MessageSquarePlus } from "lucide-react";
import { DealCategory, DealRecord } from "@/lib/catalog";
import { DEAL_CATEGORY_LABELS, Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  deals: DealRecord[];
  onToast: (msg: string) => void;
}

export function DealsPanel({ locale, deals, onToast }: Props) {
  const isZh = locale === "zh";
  const [filter, setFilter] = useState<"all" | DealCategory>("all");
  const [openModal, setOpenModal] = useState(false);
  const [toolName, setToolName] = useState("");
  const [note, setNote] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const labels = DEAL_CATEGORY_LABELS[locale];
  const filtered = filter === "all" ? deals : deals.filter((d) => d.category === filter);

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName, note, sourceUrl, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast(data.error || (isZh ? "提交失败" : "Submission failed"));
        return;
      }
      setToolName("");
      setNote("");
      setSourceUrl("");
      setOpenModal(false);
      onToast(isZh ? "纠错已存入后端数据库，感谢贡献！" : "Saved to database. Thanks for contributing!");
    } catch {
      onToast(isZh ? "网络错误，请稍后重试" : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-base font-bold">
            {isZh ? "AI 省钱情报站（2026 公开核验）" : "Verified AI Deals & Alternatives (2026)"}
          </h2>
          <p className="text-xs text-slate-500">
            {isZh
              ? "聚合教育优惠、年付折扣、国产高性价比与开源 BYOK 平替"
              : "Education discounts, annual savings, China AI value picks & open-source BYOK options."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["all", "annual", "education", "alternative", "china"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === cat
                  ? "bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {labels[cat]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <span>{isZh ? "价格有变？提交纠错" : "Report Price Change"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((deal) => (
          <article
            key={deal.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {labels[deal.category]}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800">
                  {isZh ? deal.saveBadgeZh : deal.saveBadgeEn}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold">{isZh ? deal.titleZh : deal.titleEn}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {isZh ? deal.descZh : deal.descEn}
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <a
                href={deal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-500"
              >
                <span>{deal.sourceLabel}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </article>
        ))}
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-bold">
              {isZh ? "提交价格变动 / 新优惠线索" : "Submit Price Update / Deal"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {isZh
                ? "提交后将通过 POST /api/feedback 写入后台数据库等待审核上线。"
                : "Persisted via POST /api/feedback for catalog updates."}
            </p>
            <form onSubmit={handleSubmitFeedback} className="mt-4 space-y-3">
              <input
                type="text"
                required
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                placeholder={isZh ? "涉及工具（如 Cursor / Kimi）" : "Tool name (e.g. Cursor)"}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
              />
              <textarea
                rows={3}
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isZh ? "具体价格变化或优惠说明..." : "Describe the pricing change..."}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
              />
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={isZh ? "官方链接（可选）" : "Official pricing URL (optional)"}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold dark:border-slate-700"
                >
                  {isZh ? "取消" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {submitting ? "..." : isZh ? "提交入库" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
