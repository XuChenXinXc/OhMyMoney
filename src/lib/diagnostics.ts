import { CatalogTool, UserSubscription, getSubMonthlyUsd } from "./catalog";
import { Locale } from "./i18n";

export interface DiagnosticIssue {
  id: string;
  severity: "high" | "medium" | "tip";
  title: string;
  desc: string;
  saveUsd: number;
  actionLabel: string;
  actionType: "remove-sub" | "switch-annual";
  targetId: string;
}

export interface AuditResult {
  issues: DiagnosticIssue[];
  totalSaveUsd: number;
  tierKey: "minimalist" | "investor" | "whale" | "philanthropist";
}

export function runDiagnostics(
  subs: UserSubscription[],
  apiSpendUsd: number,
  locale: Locale
): AuditResult {
  const issues: DiagnosticIssue[] = [];
  const isZh = locale === "zh";

  // 1. Overlapping paid chat subscriptions
  const paidChat = subs.filter((s) => s.category === "chat" && getSubMonthlyUsd(s) > 0);
  if (paidChat.length >= 2) {
    const sorted = [...paidChat].sort((a, b) => getSubMonthlyUsd(a) - getSubMonthlyUsd(b));
    const extras = sorted.slice(0, sorted.length - 1);
    const saveUsd = extras.reduce((sum, s) => sum + getSubMonthlyUsd(s), 0);
    const names = paidChat.map((s) => (isZh ? s.name : s.nameEn)).join(" / ");
    const targetName = isZh ? extras[0].name : extras[0].nameEn;
    issues.push({
      id: "overlap-chat",
      severity: "high",
      title: isZh
        ? `检测到 ${paidChat.length} 个付费「对话全能」会员重叠`
        : `${paidChat.length} overlapping paid chat subscriptions`,
      desc: isZh
        ? `你同时付费订阅了 ${names}。建议只保留 1 个主力旗舰，其余降级免费版（如 DeepSeek/豆包）或按量 API。`
        : `You are paying for ${names} simultaneously. Keep 1 primary flagship and move secondary usage to free tiers or pay-as-you-go API.`,
      saveUsd,
      actionLabel: isZh ? `先移除 ${targetName}` : `Remove ${targetName}`,
      actionType: "remove-sub",
      targetId: extras[0].id,
    });
  }

  // 2. Overlapping paid coding tools
  const paidCoding = subs.filter((s) => s.category === "coding" && getSubMonthlyUsd(s) > 0);
  if (paidCoding.length >= 2) {
    const sorted = [...paidCoding].sort((a, b) => getSubMonthlyUsd(a) - getSubMonthlyUsd(b));
    const cheaper = sorted[0];
    const targetName = isZh ? cheaper.name : cheaper.nameEn;
    issues.push({
      id: "overlap-coding",
      severity: "medium",
      title: isZh
        ? `编程工具功能重叠（${paidCoding.map((s) => s.name).join(" + ")}）`
        : `Overlapping coding plans (${paidCoding.map((s) => s.nameEn).join(" + ")})`,
      desc: isZh
        ? "同时开多个编程订阅易重复付费：日常补全留 Copilot Pro ($10) 最省，重度 Agent 留 Cursor Pro 即可。"
        : "Paying for multiple coding IDEs adds up quickly. Keep Copilot Pro ($10) for lean completion or Cursor for agentic workflows.",
      saveUsd: getSubMonthlyUsd(cheaper),
      actionLabel: isZh ? `先移除 ${targetName}` : `Remove ${targetName}`,
      actionType: "remove-sub",
      targetId: cheaper.id,
    });
  }

  // 3. Low usage paid subs
  subs
    .filter((s) => s.usage === "low" && getSubMonthlyUsd(s) > 0)
    .forEach((s) => {
      const name = isZh ? s.name : s.nameEn;
      issues.push({
        id: `low-${s.id}`,
        severity: "high",
        title: isZh ? `低频闲置预警：${name}` : `Low-usage warning: ${name}`,
        desc: isZh
          ? "你将其标为「低频闲置」，继续包月单次使用成本过高。建议先取消自动续费，需要时再开单月卡。"
          : "Marked as rarely used. Cancel auto-renewal and only subscribe during months you actively need it.",
        saveUsd: getSubMonthlyUsd(s),
        actionLabel: isZh ? "从账单移除" : "Remove from stack",
        actionType: "remove-sub",
        targetId: s.id,
      });
    });

  // 4. Annual billing discount opportunities
  subs.forEach((s) => {
    if (s.billingCycle === "monthly" && s.usage !== "low" && s.annualMonthlyUsd < s.priceUsd) {
      const diff = s.priceUsd - s.annualMonthlyUsd;
      const name = isZh ? s.name : s.nameEn;
      issues.push({
        id: `annual-${s.id}`,
        severity: "tip",
        title: isZh ? `${name} 切年付可立省费用` : `Switch ${name} to annual billing`,
        desc: isZh
          ? `高频/中频在用工具改按年付每月可省 $${diff.toFixed(2)}（一年省 $${(diff * 12).toFixed(0)}）。`
          : `Since you use this regularly, annual billing saves $${diff.toFixed(2)}/mo ($${(diff * 12).toFixed(0)}/yr).`,
        saveUsd: diff,
        actionLabel: isZh ? "一键切换年付" : "Switch to annual",
        actionType: "switch-annual",
        targetId: s.id,
      });
    }
  });

  const totalMonthly =
    subs.reduce((sum, s) => sum + getSubMonthlyUsd(s), 0) + (Number(apiSpendUsd) || 0);
  let tierKey: AuditResult["tierKey"] = "minimalist";
  if (totalMonthly >= 100) tierKey = "philanthropist";
  else if (totalMonthly >= 55) tierKey = "whale";
  else if (totalMonthly >= 25) tierKey = "investor";

  const maxSaveByTarget = new Map<string, number>();
  issues.forEach((i) => {
    const prev = maxSaveByTarget.get(i.targetId) ?? 0;
    if (i.saveUsd > prev) maxSaveByTarget.set(i.targetId, i.saveUsd);
  });
  const dedupedSave = Math.min(
    totalMonthly,
    Array.from(maxSaveByTarget.values()).reduce((sum, v) => sum + v, 0)
  );

  return {
    issues,
    totalSaveUsd: dedupedSave,
    tierKey,
  };
}

export type PersonaKey = "dev" | "creator" | "student" | "office" | "china-value";

export interface RecommendationPick {
  tool: CatalogTool;
  billingCycle: "monthly" | "annual";
  effectiveUsd: number;
  reasonZh: string;
  reasonEn: string;
}

export function buildRecommendation(
  persona: PersonaKey,
  budgetUsd: number,
  catalog: CatalogTool[]
): { picks: RecommendationPick[]; totalUsd: number; tipZh: string; tipEn: string } {
  const byId = new Map(catalog.map((t) => [t.id, t]));
  const rules: Record<
    PersonaKey,
    {
      tipZh: string;
      tipEn: string;
      items: {
        id: string;
        minBudget: number;
        preferAnnual?: boolean;
        overrideUsd?: number;
        replaces?: string;
        reasonZh: string;
        reasonEn: string;
      }[];
    }
  > = {
    dev: {
      tipZh:
        "开发者公认黄金法则：1 个主力 AI IDE（Cursor Pro）+ 1 个推理/对话主力（预算紧用免费 DeepSeek，预算足上 Claude Pro），避免同时为多个 IDE 或多个 $20 聊天会员付费。",
      tipEn:
        "Proven dev consensus: 1 AI IDE (Cursor Pro) + 1 reasoning/chat model (DeepSeek free on a budget, or Claude Pro at $40+).",
      items: [
        {
          id: "deepseek-web",
          minBudget: 0,
          reasonZh: "免费强推理模型，日常查错与技术问答零成本兜底",
          reasonEn: "Free strong reasoning model for everyday debugging & Q&A.",
        },
        {
          id: "github-copilot-pro",
          minBudget: 10,
          reasonZh: "低预算首选：$10/月搞定 IDE 补全与高级模型请求",
          reasonEn: "Best $10/mo entry-level IDE completion & chat.",
        },
        {
          id: "cursor-pro",
          minBudget: 20,
          replaces: "github-copilot-pro",
          reasonZh: "开发者公认主力 AI IDE（$20/月），全项目上下文与 Agent 编程体验最佳",
          reasonEn: "Community-favorite AI IDE ($20/mo) for full-repo Agent coding.",
        },
        {
          id: "claude-pro",
          minBudget: 40,
          reasonZh: "与 Cursor 形成黄金双旗舰：复杂架构设计、长文档与代码审查最强",
          reasonEn: "Gold-standard pairing with Cursor for architecture & deep code review.",
        },
      ],
    },
    creator: {
      tipZh:
        "内容创作者核心组合是「ChatGPT Plus（全能文案+多模态）+ Midjourney（视觉审美天花板）」，音视频工具仅在集中产出期按月开通最省钱。",
      tipEn:
        "The core creator stack is ChatGPT Plus + Midjourney Basic (annual); only add Suno/video plans during active production months.",
      items: [
        {
          id: "deepseek-web",
          minBudget: 0,
          reasonZh: "免费中文长文大纲与选题头脑风暴",
          reasonEn: "Free outlining & brainstorming assistant.",
        },
        {
          id: "midjourney-basic",
          minBudget: 10,
          preferAnnual: true,
          reasonZh: "公认审美第一的 AI 出图工具，年付折合 $8/月",
          reasonEn: "Top-tier visual aesthetics at $8/mo billed annually.",
        },
        {
          id: "chatgpt-plus",
          minBudget: 25,
          replaces: "deepseek-web",
          reasonZh: "选题脚本、多模态理解、数据分析与改稿全能主力",
          reasonEn: "All-in-one scripting, multimodal ideation & editing flagship.",
        },
        {
          id: "suno-pro",
          minBudget: 40,
          preferAnnual: true,
          reasonZh: "短视频原创 BGM 与人声配乐，年付仅 $8/月",
          reasonEn: "Original BGM & tracks for video creators ($8/mo annually).",
        },
      ],
    },
    student: {
      tipZh:
        "学生党切忌原价全买！先用高校邮箱白嫖 GitHub Copilot 教育免费版，再配 Perplexity 教育版（$10）或 Gemini（含 2TB 云盘）+ 免费 DeepSeek，极省且覆盖论文/代码全流程。",
      tipEn:
        "Claim free GitHub Copilot Education first, then pair Perplexity Education Pro ($10) or Google AI Pro with free DeepSeek.",
      items: [
        {
          id: "deepseek-web",
          minBudget: 0,
          reasonZh: "数学推导、代码调试与中文论文润色免费主力",
          reasonEn: "Free math, coding & thesis drafting backbone.",
        },
        {
          id: "perplexity-pro",
          minBudget: 10,
          overrideUsd: 10,
          reasonZh: "查文献带真实引用来源，教育邮箱认证直降半价 $10/月",
          reasonEn: "Cited literature search at 50% off ($10/mo Education Pro).",
        },
        {
          id: "google-ai-pro",
          minBudget: 30,
          reasonZh: "超长上下文读整本 PDF 论文 + 附赠 2TB Google 云盘备份资料",
          reasonEn: "Long-context PDF reading + 2TB cloud storage bundle.",
        },
      ],
    },
    office: {
      tipZh:
        "日常职场办公最忌买一堆小众 AI 订阅：1 个主流旗舰（ChatGPT Plus 或 Kimi Go）配合免费的 DeepSeek/豆包，就能覆盖 90% 的周报、PPT、邮件与会议纪要场景。",
      tipEn:
        "Skip niche single-purpose AI apps — one mainstream flagship (ChatGPT Plus) plus free DeepSeek/Doubao covers 90% of office work.",
      items: [
        {
          id: "deepseek-web",
          minBudget: 0,
          reasonZh: "日常问答、写邮件与方案梳理零成本主力",
          reasonEn: "Zero-cost daily writing, email & planning assistant.",
        },
        {
          id: "kimi-go",
          minBudget: 5,
          preferAnnual: true,
          reasonZh: "长文档解析、做 PPT 与中文资料整理高性价比之选（年付约 ¥39/月）",
          reasonEn: "Great value for long documents, slides & Chinese office tasks.",
        },
        {
          id: "chatgpt-plus",
          minBudget: 20,
          replaces: "kimi-go",
          reasonZh: "职场公认综合能力最稳的全能旗舰（$20/月）",
          reasonEn: "Most reliable all-around flagship for everyday office workflows.",
        },
        {
          id: "perplexity-pro",
          minBudget: 40,
          preferAnnual: true,
          reasonZh: "行业调研与竞品资料速查，年付折合 $16.67/月",
          reasonEn: "Fast cited market & competitor research ($16.67/mo annual).",
        },
      ],
    },
    "china-value": {
      tipZh:
        "国内用户最受认可的极省方案：免费 DeepSeek（深度推理）+ 免费豆包（语音/日常检索）打底，有长文档/PPT 刚需再加 Kimi Go（年付 ¥39/月），月均不到一杯咖啡钱。",
      tipEn:
        "Most popular China value stack: Free DeepSeek + Free Doubao, optionally adding Kimi Go (~¥39/mo annual) for heavy document workflows.",
      items: [
        {
          id: "deepseek-web",
          minBudget: 0,
          reasonZh: "深度思考与推理能力第一梯队，网页/App 免费",
          reasonEn: "Top-tier free reasoning on web & mobile.",
        },
        {
          id: "doubao-free",
          minBudget: 0,
          reasonZh: "响应极快、语音对话与日常信息查询免费神器",
          reasonEn: "Fast free everyday assistant with strong voice mode.",
        },
        {
          id: "kimi-go",
          minBudget: 5,
          preferAnnual: true,
          reasonZh: "重度读财报、整理长文档与做 PPT 必选（连续包年 ¥39/月）",
          reasonEn: "Best value for long docs, reports & slides (~¥39/mo annual).",
        },
        {
          id: "cursor-pro",
          minBudget: 25,
          reasonZh: "若涉及写代码，把海外预算集中投给 Cursor Pro ($20/月)",
          reasonEn: "Focus international budget on Cursor Pro ($20/mo) if coding.",
        },
      ],
    },
  };

  const rule = rules[persona] ?? rules.dev;
  let chosen: RecommendationPick[] = [];

  for (const item of rule.items) {
    if (budgetUsd >= item.minBudget) {
      if (item.replaces) {
        chosen = chosen.filter((c) => c.tool.id !== item.replaces);
      }
      const tool = byId.get(item.id);
      if (!tool) continue;
      const useAnnual = Boolean(item.preferAnnual && tool.annualMonthlyUsd < tool.priceUsd);
      const effectiveUsd =
        item.overrideUsd !== undefined
          ? item.overrideUsd
          : useAnnual
            ? tool.annualMonthlyUsd
            : tool.priceUsd;
      chosen.push({
        tool,
        billingCycle: useAnnual ? "annual" : "monthly",
        effectiveUsd,
        reasonZh: item.reasonZh,
        reasonEn: item.reasonEn,
      });
    }
  }

  while (chosen.length > 1 && chosen.reduce((s, c) => s + c.effectiveUsd, 0) > budgetUsd) {
    chosen.pop();
  }

  return {
    picks: chosen,
    totalUsd: chosen.reduce((s, c) => s + c.effectiveUsd, 0),
    tipZh: rule.tipZh,
    tipEn: rule.tipEn,
  };
}
