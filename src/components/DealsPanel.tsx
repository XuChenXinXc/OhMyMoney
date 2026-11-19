"use client";

import { useState } from "react";
import { ExternalLink, MessageSquarePlus, RefreshCw } from "lucide-react";
import { DealCategory, DealRecord } from "@/lib/catalog";
import { DEAL_CATEGORY_LABELS, Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  deals: DealRecord[];
  onToast: (msg: string) => void;
}

export function DealsPanel({ locale, deals: initialDeals, onToast }: Props) {
  const isZh = locale === "zh";
  const [deals, setDeals] = useState<DealRecord[]>(initialDeals);
  const [filter, setFilter] = useState<"all" | DealCategory>("all");
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [toolName, setToolName] = useState("");
  const [note, setNote] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const labels = DEAL_CATEGORY_LABELS[locale];
  const filtered = filter === "all" ? deals : deals.filter((d) => d.category === filter);

  async function handleSyncDeals() {
    setSyncing(true);
    try {
      const res = await fetch("/api/deals/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        onToast(isZh ? "同步失败，请稍后重试" : "Sync failed");
        return;
      }
      if (Array.isArray(data.deals)) {
        setDeals(data.deals);
      }
      setLastSynced(new Date().toLocaleTimeString());
      onToast(
        isZh
          ? `已同步最新情报（新增 ${data.fetchedCount ?? 0} 条实时动态）`
          : `Synced latest deals (${data.fetchedCount ?? 0} live items)`
      );
    } catch {
      onToast(isZh ? "网络请求失败" : "Network error");
    } finally {
      setSyncing(false);
    }
  }

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
      <div className="brutal-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-display text-lg font-extrabold">
            {isZh ? "🎁 AI 省钱情报站（支持实时抓取更新）" : "🎁 Verified AI Deals & Live Feed"}
          </h2>
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {isZh
              ? `聚合 2026 核验折扣 + 实时抓取接口（/api/deals/sync）${lastSynced ? ` · 上次同步 ${lastSynced}` : ""}`
              : `Curated 2026 deals + live sync via /api/deals/sync${lastSynced ? ` · Synced ${lastSynced}` : ""}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["all", "annual", "education", "alternative", "china"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`rounded-lg border-2 border-black px-3 py-1 text-xs font-extrabold transition dark:border-zinc-200 ${
                filter === cat
                  ? "bg-black text-[#FFE500] dark:bg-[#FFE500] dark:text-black"
                  : "bg-[#FFF8E7] text-black hover:bg-[#FFE500]/50 dark:bg-zinc-900 dark:text-white"
              }`}
            >
              {labels[cat]}
            </button>
          ))}
          <button
            type="button"
            disabled={syncing}
            onClick={handleSyncDeals}
            className="brutal-btn inline-flex items-center gap-1.5 rounded-xl bg-[#00E599] px-3.5 py-1.5 text-xs font-black text-black hover:bg-emerald-300 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? (isZh ? "同步中..." : "Syncing...") : isZh ? "拉取最新情报" : "Sync Live"}</span>
          </button>
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="brutal-btn inline-flex items-center gap-1.5 rounded-xl bg-[#FFE500] px-3.5 py-1.5 text-xs font-black text-black hover:bg-yellow-300"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <span>{isZh ? "提交价格纠错" : "Report Price"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((deal) => (
          <article key={deal.id} className="brutal-card flex flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md border border-black bg-[#FFF8E7] px-2.5 py-0.5 text-[11px] font-extrabold text-black">
                  {labels[deal.category]}
                </span>
                <span className="rounded-md border-2 border-black bg-[#00E599] px-2.5 py-0.5 font-mono text-[11px] font-black text-black">
                  {isZh ? deal.saveBadgeZh : deal.saveBadgeEn}
                </span>
              </div>
              <h3 className="mt-3 font-display text-base font-extrabold">
                {isZh ? deal.titleZh : deal.titleEn}
              </h3>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-zinc-700 dark:text-zinc-300">
                {isZh ? deal.descZh : deal.descEn}
              </p>
            </div>
            <div className="mt-4 border-t-2 border-black/15 pt-3 dark:border-white/15">
              <a
                href={deal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-extrabold text-[#3B82F6] hover:underline"
              >
                <span>{deal.sourceLabel}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        ))}
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="brutal-card w-full max-w-md p-6">
            <h3 className="font-display text-lg font-extrabold">
              {isZh ? "提交价格变动 / 新优惠线索" : "Submit Price Update / Deal"}
            </h3>
            <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
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
                className="w-full rounded-xl border-2 border-black bg-[#FFF8E7] px-3 py-2 text-sm font-semibold text-black outline-none"
              />
              <textarea
                rows={3}
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isZh ? "具体价格变化或优惠说明..." : "Describe the pricing change..."}
                className="w-full rounded-xl border-2 border-black bg-[#FFF8E7] px-3 py-2 text-sm font-semibold text-black outline-none"
              />
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={isZh ? "官方链接（可选）" : "Official pricing URL (optional)"}
                className="w-full rounded-xl border-2 border-black bg-[#FFF8E7] px-3 py-2 text-sm font-semibold text-black outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="brutal-btn rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-black"
                >
                  {isZh ? "取消" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="brutal-btn rounded-xl bg-[#00E599] px-5 py-2 text-xs font-black text-black disabled:opacity-50"
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
