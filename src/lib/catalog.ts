export type Region = "global" | "china";
export type ToolCategory = "chat" | "search" | "coding" | "visual" | "audio";
export type DealCategory = "annual" | "education" | "alternative" | "china";
export type CurrencyCode = "USD" | "CNY" | "JPY";
export type BillingCycle = "monthly" | "annual";
export type UsageLevel = "high" | "medium" | "low";

export interface CatalogTool {
  id: string;
  name: string;
  nameEn: string;
  region: Region;
  category: ToolCategory;
  priceUsd: number;
  annualMonthlyUsd: number;
  nativePriceLabel: string;
  noteZh: string;
  noteEn: string;
  sourceUrl: string;
}

export interface UserSubscription extends CatalogTool {
  billingCycle: BillingCycle;
  usage: UsageLevel;
  renewalDay: number;
  isCustom?: boolean;
}

export interface DealRecord {
  id: string;
  category: DealCategory;
  titleZh: string;
  titleEn: string;
  saveBadgeZh: string;
  saveBadgeEn: string;
  descZh: string;
  descEn: string;
  sourceLabel: string;
  url: string;
}

export const CURRENCY_META: Record<CurrencyCode, { symbol: string; rate: number; decimals: number }> = {
  USD: { symbol: "$", rate: 1, decimals: 2 },
  CNY: { symbol: "¥", rate: 7.2, decimals: 0 },
  JPY: { symbol: "¥", rate: 152, decimals: 0 },
};

export function setLiveCurrencyRates(rates: Partial<Record<CurrencyCode, number>>) {
  if (typeof rates.CNY === "number" && rates.CNY > 0) CURRENCY_META.CNY.rate = rates.CNY;
  if (typeof rates.JPY === "number" && rates.JPY > 0) CURRENCY_META.JPY.rate = rates.JPY;
}

export function fromUsdToCurrency(usd: number, currency: CurrencyCode): number {
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.USD;
  const val = (Number.isFinite(usd) ? usd : 0) * meta.rate;
  return Number(val.toFixed(meta.decimals));
}

export function fromCurrencyToUsd(amount: number, currency: CurrencyCode): number {
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.USD;
  if (!Number.isFinite(amount) || amount < 0 || meta.rate <= 0) return 0;
  return Number((amount / meta.rate).toFixed(4));
}

export function formatMoney(usd: number, currency: CurrencyCode): string {
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.USD;
  const val = (Number.isFinite(usd) ? usd : 0) * meta.rate;
  return (
    meta.symbol +
    val.toLocaleString("en-US", {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    })
  );
}

export function getSubMonthlyUsd(sub: UserSubscription): number {
  const val = sub.billingCycle === "annual" ? sub.annualMonthlyUsd : sub.priceUsd;
  return Number.isFinite(val) && val >= 0 ? val : 0;
}

// 2026 Verified Global + Domestic AI Tool Catalog
export const SEED_TOOLS: CatalogTool[] = [
  {
    id: "chatgpt-plus",
    name: "ChatGPT Plus",
    nameEn: "ChatGPT Plus",
    region: "global",
    category: "chat",
    priceUsd: 20,
    annualMonthlyUsd: 20,
    nativePriceLabel: "$20/mo",
    noteZh: "通用主力对话与多模态，含免费版可随时降级",
    noteEn: "All-around flagship chat & multimodal; free tier available.",
    sourceUrl: "https://skilzy.io/en/prix-ia",
  },
  {
    id: "claude-pro",
    name: "Claude Pro",
    nameEn: "Claude Pro",
    region: "global",
    category: "chat",
    priceUsd: 20,
    annualMonthlyUsd: 20,
    nativePriceLabel: "$20/mo",
    noteZh: "长文写作与代码理解出色，与 ChatGPT 容易重叠",
    noteEn: "Strong writing & coding reasoning; often overlaps with ChatGPT.",
    sourceUrl: "https://skilzy.io/en/prix-ia",
  },
  {
    id: "google-ai-pro",
    name: "Google AI Pro (Gemini)",
    nameEn: "Google AI Pro (Gemini)",
    region: "global",
    category: "chat",
    priceUsd: 19.99,
    annualMonthlyUsd: 19.99,
    nativePriceLabel: "$19.99/mo",
    noteZh: "捆绑大云盘存储与 Gemini 高阶模型，适合 Google 生态",
    noteEn: "Bundles cloud storage with Gemini Pro models.",
    sourceUrl: "https://skilzy.io/en/prix-ia",
  },
  {
    id: "le-chat-pro",
    name: "Le Chat Pro (Mistral)",
    nameEn: "Le Chat Pro (Mistral)",
    region: "global",
    category: "chat",
    priceUsd: 14.99,
    annualMonthlyUsd: 14.99,
    nativePriceLabel: "$14.99/mo",
    noteZh: "比三大 $20 旗舰便宜约 25% 的轻量化对话平替",
    noteEn: "~25% cheaper alternative to the $20 flagship chat plans.",
    sourceUrl: "https://skilzy.io/en/prix-ia",
  },
  {
    id: "kimi-go",
    name: "Kimi Go 会员",
    nameEn: "Kimi Go (CN)",
    region: "china",
    category: "chat",
    priceUsd: 6.81,
    annualMonthlyUsd: 5.42,
    nativePriceLabel: "¥49/月 (年付 ¥39)",
    noteZh: "日常文档、PPT、深度研究与网站部署，连续包年 ¥468/年",
    noteEn: "Docs, slides & deep research (¥49/mo; ¥468/yr).",
    sourceUrl: "https://www.kimi.com/help/membership/membership-pricing",
  },
  {
    id: "kimi-plus",
    name: "Kimi Plus 会员",
    nameEn: "Kimi Plus (CN)",
    region: "china",
    category: "coding",
    priceUsd: 13.75,
    annualMonthlyUsd: 10.97,
    nativePriceLabel: "¥99/月 (年付 ¥79)",
    noteZh: "含 Kimi Code 与 Agent 集群，连续包年 ¥948/年",
    noteEn: "Includes Kimi Code & Agent Swarm (¥99/mo; ¥948/yr).",
    sourceUrl: "https://www.kimi.com/help/membership/membership-pricing",
  },
  {
    id: "kimi-pro",
    name: "Kimi Pro 会员",
    nameEn: "Kimi Pro (CN)",
    region: "china",
    category: "chat",
    priceUsd: 27.64,
    annualMonthlyUsd: 22.08,
    nativePriceLabel: "¥199/月 (年付 ¥159)",
    noteZh: "含目标模式与专属 Kimi Claw，连续包年 ¥1,908/年",
    noteEn: "Higher quota + Kimi Claw cloud sandbox (¥199/mo; ¥1,908/yr).",
    sourceUrl: "https://www.kimi.com/help/membership/membership-pricing",
  },
  {
    id: "deepseek-web",
    name: "DeepSeek 网页版 / App",
    nameEn: "DeepSeek Web / App",
    region: "china",
    category: "chat",
    priceUsd: 0,
    annualMonthlyUsd: 0,
    nativePriceLabel: "免费 (API 按量)",
    noteZh: "网页与 App 主力免费；API 按百万 tokens 极低价按量计费",
    noteEn: "Free web/app; ultra-low pay-as-you-go API pricing.",
    sourceUrl: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing/",
  },
  {
    id: "doubao-free",
    name: "豆包 (Doubao)",
    nameEn: "Doubao (ByteDance)",
    region: "china",
    category: "chat",
    priceUsd: 0,
    annualMonthlyUsd: 0,
    nativePriceLabel: "免费",
    noteZh: "字节跳动主力对话与语音助手，日常高频免费平替",
    noteEn: "Free everyday chat & voice assistant in China.",
    sourceUrl: "https://segmentfault.com/a/1190000047830601",
  },
  {
    id: "qwen-free",
    name: "通义千问 (Qwen)",
    nameEn: "Qwen (Alibaba)",
    region: "china",
    category: "chat",
    priceUsd: 0,
    annualMonthlyUsd: 0,
    nativePriceLabel: "免费 (百炼 API 按量)",
    noteZh: "个人对话免费，开发者可在阿里云百炼按量调用 Qwen 系列",
    noteEn: "Free consumer chat; pay-as-you-go API via Alibaba Cloud.",
    sourceUrl: "https://help.aliyun.com/zh/model-studio/model-pricing",
  },
  {
    id: "perplexity-pro",
    name: "Perplexity Pro",
    nameEn: "Perplexity Pro",
    region: "global",
    category: "search",
    priceUsd: 20,
    annualMonthlyUsd: 16.67,
    nativePriceLabel: "$20/mo (Edu $10)",
    noteZh: "深度联网检索与文献引用；年付 $200，教育认证仅 $10/月",
    noteEn: "Deep web research & citations; $200/yr or $10/mo Education Pro.",
    sourceUrl: "https://www.finout.io/blog/perplexity-pricing-in-2026",
  },
  {
    id: "cursor-pro",
    name: "Cursor Pro",
    nameEn: "Cursor Pro",
    region: "global",
    category: "coding",
    priceUsd: 20,
    annualMonthlyUsd: 20,
    nativePriceLabel: "$20/mo",
    noteZh: "AI 代码编辑器主力；另有 Plus ($8) 与 Premium ($30) 档位",
    noteEn: "AI-native code editor; also offers Plus ($8) & Premium ($30).",
    sourceUrl: "https://www.nxcode.io/resources/news/github-copilot-vs-cursor-2026-which-to-pay-for",
  },
  {
    id: "github-copilot-pro",
    name: "GitHub Copilot Pro",
    nameEn: "GitHub Copilot Pro",
    region: "global",
    category: "coding",
    priceUsd: 10,
    annualMonthlyUsd: 10,
    nativePriceLabel: "$10/mo",
    noteZh: "$10/月含 300 次高级请求，是目前性价比最高的 IDE 编程订阅",
    noteEn: "$10/mo with 300 premium requests; top value coding plan.",
    sourceUrl: "https://github.com/features/copilot/plans",
  },
  {
    id: "midjourney-basic",
    name: "Midjourney Basic",
    nameEn: "Midjourney Basic",
    region: "global",
    category: "visual",
    priceUsd: 10,
    annualMonthlyUsd: 8,
    nativePriceLabel: "$10/mo (年付 $8)",
    noteZh: "约 3.3 小时 Fast GPU，年付立省 20%",
    noteEn: "~3.3h Fast GPU/mo; save 20% billed annually.",
    sourceUrl: "https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans",
  },
  {
    id: "midjourney-standard",
    name: "Midjourney Standard",
    nameEn: "Midjourney Standard",
    region: "global",
    category: "visual",
    priceUsd: 30,
    annualMonthlyUsd: 24,
    nativePriceLabel: "$30/mo (年付 $24)",
    noteZh: "15 小时 Fast GPU + 无限 Relax 模式，年付省 20%",
    noteEn: "15h Fast GPU + unlimited Relax mode; 20% off annual.",
    sourceUrl: "https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans",
  },
  {
    id: "runway-standard",
    name: "Runway Standard",
    nameEn: "Runway Standard",
    region: "global",
    category: "visual",
    priceUsd: 15,
    annualMonthlyUsd: 12,
    nativePriceLabel: "$15/mo (年付 $12)",
    noteZh: "625 积分/月，注意官网默认展示年付 $12，按月实付 $15",
    noteEn: "625 credits/mo ($15 monthly or $12/mo billed annually).",
    sourceUrl: "https://aitoolsbakery.com/blog/runway-pricing/",
  },
  {
    id: "suno-pro",
    name: "Suno Pro",
    nameEn: "Suno Pro",
    region: "global",
    category: "audio",
    priceUsd: 10,
    annualMonthlyUsd: 8,
    nativePriceLabel: "$10/mo (年付 $8)",
    noteZh: "2,500 积分与 20 首成品下载/月，年付省 20%",
    noteEn: "2,500 credits & 20 track downloads/mo; 20% off annual.",
    sourceUrl: "https://suno.com/pricing",
  },
  {
    id: "elevenlabs-starter",
    name: "ElevenLabs Starter",
    nameEn: "ElevenLabs Starter",
    region: "global",
    category: "audio",
    priceUsd: 5,
    annualMonthlyUsd: 5,
    nativePriceLabel: "$5/mo",
    noteZh: "入门级 AI 语音合成，轻度短视频配音门槛最低",
    noteEn: "Entry-level AI voice synthesis for light creator workloads.",
    sourceUrl: "https://elevenlabs.io/pricing",
  },
  {
    id: "notion-business",
    name: "Notion Business (含 AI)",
    nameEn: "Notion Business (with AI)",
    region: "global",
    category: "audio",
    priceUsd: 24,
    annualMonthlyUsd: 20,
    nativePriceLabel: "$24/mo (年付 $20)",
    noteZh: "独立 $10 AI 附加包已下线，完整 Notion AI 整合在 Business 档",
    noteEn: "Full Notion AI is now bundled into Business ($24 monthly / $20 annual).",
    sourceUrl: "https://www.notion.com/pricing",
  },
];

export const SEED_DEALS: DealRecord[] = [
  {
    id: "deal-perplexity-edu",
    category: "education",
    titleZh: "Perplexity Education Pro 教育版半价（$10/月）",
    titleEn: "Perplexity Education Pro: 50% Off ($10/mo)",
    saveBadgeZh: "立省 50%",
    saveBadgeEn: "Save 50%",
    descZh: "通过高校/教育邮箱认证后，Perplexity Pro 可从标准 $20/月直降至 $10/月；普通用户年付 $200/年也可折合 $16.67/月。",
    descEn: "Verified students and educators get Pro for $10/mo instead of $20/mo; standard annual billing drops it to $16.67/mo.",
    sourceLabel: "Finout 2026 Pricing",
    url: "https://www.finout.io/blog/perplexity-pricing-in-2026",
  },
  {
    id: "deal-kimi-annual",
    category: "china",
    titleZh: "Kimi 国内新套餐连续包年直降 20%（Go 低至 ¥39/月）",
    titleEn: "Kimi Annual Plans Save 20% (Go from ¥39/mo)",
    saveBadgeZh: "省 20%",
    saveBadgeEn: "20% Off",
    descZh: "Kimi Go 连续包月 ¥49/月、包年 ¥468/年（折合 ¥39/月）；需要 Kimi Code 的用户选 Plus 包年折合 ¥79/月。注意停用闲置的 Kimi Claw 云主机可避免每日 0.6% 额度扣除。",
    descEn: "Kimi Go drops from ¥49 to ¥39/mo annually; Plus with Kimi Code drops from ¥99 to ¥79/mo. Remember to delete idle Kimi Claw sandboxes to avoid daily quota drain.",
    sourceLabel: "Kimi 官方定价页",
    url: "https://www.kimi.com/help/membership/membership-pricing",
  },
  {
    id: "deal-deepseek-api",
    category: "china",
    titleZh: "DeepSeek 网页版免费 + 极低价按量 API 平替",
    titleEn: "DeepSeek Free Web + Ultra-Low Pay-as-You-Go API",
    saveBadgeZh: "低至 ¥0.02/M",
    saveBadgeEn: "From ¥0.02/M",
    descZh: "日常对话可直接使用免费网页版/App；开发者用 API 调用 deepseek-flash 缓存命中低至 ¥0.02–0.04/百万 tokens，大幅降低轻中度用户的月费压力。",
    descEn: "Use DeepSeek web/app for free or pair BYOK clients with deepseek-flash API starting at ¥0.02–0.04 per 1M cached input tokens.",
    sourceLabel: "DeepSeek API 官方文档",
    url: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing/",
  },
  {
    id: "deal-copilot-vs-cursor",
    category: "alternative",
    titleZh: "编程工具降本：GitHub Copilot Pro ($10) 或开源 Cline + 自备 API",
    titleEn: "Coding Cost Cut: GitHub Copilot Pro ($10) or Open-Source Cline + BYOK",
    saveBadgeZh: "省 $10+/月",
    saveBadgeEn: "Save $10+/mo",
    descZh: "若以代码补全和常规问答为主，GitHub Copilot Pro 仅 $10/月（含 300 次高级请求）；用量波动大的开发者可用免费开源插件 Cline 接按量 API。",
    descEn: "GitHub Copilot Pro delivers 300 premium requests at half the cost of Cursor Pro; irregular users can run open-source Cline with pay-as-you-go API keys.",
    sourceLabel: "GitHub Copilot Plans",
    url: "https://github.com/features/copilot/plans",
  },
  {
    id: "deal-mj-annual",
    category: "annual",
    titleZh: "Midjourney 全档位年付统一 8 折（省 20%）",
    titleEn: "Midjourney 20% Annual Discount Across All Tiers",
    saveBadgeZh: "年省 $24–$288",
    saveBadgeEn: "Save $24–$288/yr",
    descZh: "高频出图用户切年付后，Basic 从 $10 降至 $8/月，Standard 从 $30 降至 $24/月；低频用户建议仅在集中出图月份开单月卡。",
    descEn: "Annual billing cuts Basic to $8/mo and Standard to $24/mo. Occasional users are better off subscribing only during active project months.",
    sourceLabel: "Midjourney Docs",
    url: "https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans",
  },
  {
    id: "deal-lechat",
    category: "alternative",
    titleZh: "海外轻量对话平替：Mistral Le Chat Pro ($14.99/月)",
    titleEn: "Budget Global Chat Alternative: Mistral Le Chat Pro ($14.99/mo)",
    saveBadgeZh: "省约 25%",
    saveBadgeEn: "~25% Cheaper",
    descZh: "相比 $20/月的三大海外旗舰，Mistral Le Chat Pro 仅 $14.99/月，适合不需要深度生态绑定的轻度付费用户。",
    descEn: "Priced at $14.99/mo instead of the $20 anchor, making it a strong option for lighter daily chat needs.",
    sourceLabel: "Skilzy 2026 Comparison",
    url: "https://skilzy.io/en/prix-ia",
  },
  {
    id: "deal-runway-suno",
    category: "annual",
    titleZh: "音视频订阅看清「默认展示年付价」与月付差价",
    titleEn: "Watch Out for Annual-First Pricing on Video & Music AI",
    saveBadgeZh: "年付省 20%",
    saveBadgeEn: "20% Off Annual",
    descZh: "Runway Standard 年付折合 $12/月但按月实付 $15/月；Suno Pro 年付折合 $8/月但按月实付 $10/月。长期创作者切年付更省，临时测试别误选年付锁死预算。",
    descEn: "Runway Standard is $15 monthly ($12 annual) and Suno Pro is $10 monthly ($8 annual). Pick annual only if you create every month.",
    sourceLabel: "AIToolsBakery Runway Guide",
    url: "https://aitoolsbakery.com/blog/runway-pricing/",
  },
  {
    id: "deal-notion-ai",
    category: "alternative",
    titleZh: "Notion AI 已取消 $10 独立附加包，纯写作别盲买 Business",
    titleEn: "Notion Retired the $10 AI Add-On — Skip Business If You Only Need Writing",
    saveBadgeZh: "避坑省 $12–$24/月",
    saveBadgeEn: "Save $12–$24/mo",
    descZh: "完整 Notion AI 现整合进 Business（月付 $24 / 年付 $20）。若仅需文字润色，留在 Notion 免费或 Plus 档，把预算留给通用对话模型更划算。",
    descEn: "Full Notion AI now requires Business ($24/mo or $20/mo annual). Solo writers save more by pairing Notion Free/Plus with a general chat subscription.",
    sourceLabel: "Fello AI Notion Pricing",
    url: "https://felloai.com/notion-ai-pricing/",
  },
];
