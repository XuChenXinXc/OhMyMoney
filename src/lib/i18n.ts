export type Locale = "zh" | "en";

export const CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  zh: {
    all: "全部",
    chat: "对话全能",
    search: "搜索研究",
    coding: "编程开发",
    visual: "图像视频",
    audio: "音频办公",
    api: "API 按量",
  },
  en: {
    all: "All",
    chat: "General Chat",
    search: "Research",
    coding: "Coding",
    visual: "Image & Video",
    audio: "Audio & Docs",
    api: "Pay-as-You-Go API",
  },
};

export const DEAL_CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  zh: {
    all: "全部情报",
    annual: "年付折扣",
    education: "教育优惠",
    alternative: "高性价比平替",
    china: "国产高性价比",
  },
  en: {
    all: "All Deals",
    annual: "Annual Savings",
    education: "Education",
    alternative: "Value Alternatives",
    china: "China AI Picks",
  },
};

export const TIER_COPY: Record<Locale, Record<string, { badge: string; roast: string }>> = {
  zh: {
    minimalist: {
      badge: "理性极简党",
      roast: "花小钱办大事，你的钱包和 AI 一样清醒。",
    },
    investor: {
      badge: "效率投资人",
      roast: "处于主流 AI 用户的黄金区间，避开同类模型重叠就非常划算。",
    },
    whale: {
      badge: "AI 重度氪金党",
      roast: "工具箱非常豪华，但大概率有 1–2 个会员正处于“交了钱很少打开”的状态。",
    },
    philanthropist: {
      badge: "赛博慈善家",
      roast: "AI 巨头们的年度财报里绝对有你的功劳，快看看体检列表能砍掉哪几项！",
    },
  },
  en: {
    minimalist: {
      badge: "Lean Minimalist",
      roast: "Maximum leverage on a lean budget — your wallet stays as sharp as your prompts.",
    },
    investor: {
      badge: "Smart Investor",
      roast: "Right in the sweet spot. Avoid overlapping flagship models and you are golden.",
    },
    whale: {
      badge: "AI Power Spender",
      roast: "Impressive toolkit, though 1–2 subscriptions are likely collecting digital dust.",
    },
    philanthropist: {
      badge: "Cyber Philanthropist",
      roast: "AI labs love your credit card. Check the audit panel to trim overlapping seats!",
    },
  },
};
