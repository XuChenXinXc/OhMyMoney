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
        ? "同时开多个编程订阅易重复付费：日常补全留 Copilot Pro ($10) 最省，重度 Agent 留 Cursor 或 Kimi Plus 即可。"
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

  return {
    issues,
    totalSaveUsd: issues.reduce((sum, i) => sum + i.saveUsd, 0),
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
      tipZh: "开发者最常见浪费是同时付多个 IDE 和多个聊天会员。保留「1 个编程主力 + 1 个对话主力」，其余走按量 API 最省钱。",
      tipEn: "Keep 1 coding plan + 1 flagship chat plan, and route occasional secondary model calls through pay-as-you-go API.",
      items: [
        {
          id: "github-copilot-pro",
          minBudget: 10,
          reasonZh: "$10/月搞定 IDE 补全与 300 次高级请求，性价比标杆",
          reasonEn: "$10/mo for IDE completions + 300 premium requests.",
        },
        {
          id: "claude-pro",
          minBudget: 30,
          reasonZh: "复杂架构设计、长代码重构与文档主力",
          reasonEn: "Primary partner for architecture, refactoring & long context.",
        },
        {
          id: "cursor-pro",
          minBudget: 50,
          replaces: "github-copilot-pro",
          reasonZh: "预算充足时升级全流程 Agent 编程体验（替换 Copilot）",
          reasonEn: "Upgrade to full agentic IDE workflow (replaces Copilot).",
        },
        {
          id: "perplexity-pro",
          minBudget: 65,
          preferAnnual: true,
          reasonZh: "快速检索最新文档与报错，年付折合 $16.67/月",
          reasonEn: "Fast cited technical research ($16.67/mo billed annually).",
        },
      ],
    },
    creator: {
      tipZh: "音视频工具（Midjourney / Runway / Suno）建议淡季停月卡，确认每月高频产出后再切年付省 20%。",
      tipEn: "Subscribe to media tools only during active production months, or switch to annual billing for 20% off once consistent.",
      items: [
        {
          id: "midjourney-basic",
          minBudget: 10,
          preferAnnual: true,
          reasonZh: "高质感封面与配图主力，年付低至 $8/月",
          reasonEn: "High-aesthetic visuals starting at $8/mo annually.",
        },
        {
          id: "chatgpt-plus",
          minBudget: 30,
          reasonZh: "选题脚本、多模态灵感与改稿全能主力",
          reasonEn: "All-in-one scripting, brainstorming & multimodal assistant.",
        },
        {
          id: "suno-pro",
          minBudget: 40,
          preferAnnual: true,
          reasonZh: "原创 BGM 与短视频配乐，年付 $8/月",
          reasonEn: "Original tracks & BGM at $8/mo annually.",
        },
        {
          id: "runway-standard",
          minBudget: 55,
          preferAnnual: true,
          reasonZh: "短视频动态镜头生成，年付 $12/月",
          reasonEn: "AI video clips at $12/mo annually.",
        },
        {
          id: "elevenlabs-starter",
          minBudget: 60,
          reasonZh: "$5/月补齐高质量 AI 配音",
          reasonEn: "Natural AI voiceovers for just $5/mo.",
        },
      ],
    },
    student: {
      tipZh: "学生党优先申请教育认证折扣（如 Perplexity 教育版 $10/月），再叠加免费国产模型，月花 $10–$30 就够用。",
      tipEn: "Claim education discounts first (like Perplexity Education Pro at $10/mo) and pair with generous free tiers.",
      items: [
        {
          id: "perplexity-pro",
          minBudget: 10,
          overrideUsd: 10,
          reasonZh: "查论文与资料带精准引用（教育认证版 $10/月）",
          reasonEn: "Cited academic research ($10/mo Education Pro).",
        },
        {
          id: "google-ai-pro",
          minBudget: 30,
          reasonZh: "大云盘空间 + 长文本读文献，科研性价比高",
          reasonEn: "Cloud storage + long-context PDF analysis.",
        },
        {
          id: "github-copilot-pro",
          minBudget: 45,
          reasonZh: "写实验代码与数据分析脚本",
          reasonEn: "Coding assistant for coursework and data scripts.",
        },
      ],
    },
    office: {
      tipZh: "日常办公别被各种零散 AI 小工具收割，1 个主力对话会员配合免费国产工具即可覆盖 80% 场景。",
      tipEn: "Skip fragmented single-purpose AI apps — one solid chat plan covers 80% of everyday office tasks.",
      items: [
        {
          id: "le-chat-pro",
          minBudget: 10,
          reasonZh: "$14.99/月轻量化对话平替，邮件总结够快",
          reasonEn: "Fast $14.99/mo alternative for everyday writing & summaries.",
        },
        {
          id: "chatgpt-plus",
          minBudget: 20,
          replaces: "le-chat-pro",
          reasonZh: "预算到 $20 一步到位选综合旗舰",
          reasonEn: "All-around flagship at the $20 mark.",
        },
        {
          id: "perplexity-pro",
          minBudget: 40,
          preferAnnual: true,
          reasonZh: "行业调研与汇报资料搜集效率翻倍",
          reasonEn: "Rapid market & industry research with citations.",
        },
      ],
    },
    "china-value": {
      tipZh: "国内高性价比组合：用免费的 DeepSeek / 豆包承接日常问答，预算重点投给 Kimi Go/Plus 或单个海外刚需工具。",
      tipEn: "Pair free domestic tools (DeepSeek / Doubao) with Kimi annual plans for ultra-low monthly cost.",
      items: [
        {
          id: "deepseek-web",
          minBudget: 0,
          reasonZh: "日常深度推理与问答主力，网页/App 免费",
          reasonEn: "Free flagship reasoning on web & mobile.",
        },
        {
          id: "kimi-go",
          minBudget: 5,
          preferAnnual: true,
          reasonZh: "文档、PPT 与深度研究，连续包年折合 ¥39/月",
          reasonEn: "Docs, slides & deep research (~¥39/mo annually).",
        },
        {
          id: "kimi-plus",
          minBudget: 15,
          replaces: "kimi-go",
          preferAnnual: true,
          reasonZh: "升级含 Kimi Code 与 Agent 集群，年付折合 ¥79/月",
          reasonEn: "Adds Kimi Code & Agent Swarm (~¥79/mo annually).",
        },
        {
          id: "github-copilot-pro",
          minBudget: 25,
          reasonZh: "补齐海外主流 IDE 代码补全（$10/月）",
          reasonEn: "Adds GitHub Copilot Pro IDE completion ($10/mo).",
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
