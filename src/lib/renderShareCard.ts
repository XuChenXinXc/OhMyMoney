import { CurrencyCode, formatMoney } from "./catalog";
import { Locale, TIER_COPY } from "./i18n";

export interface ShareCardPayload {
  locale: Locale;
  currency: CurrencyCode;
  monthlyUsd: number;
  yearlyUsd: number;
  savingsUsd: number;
  subCount: number;
  apiSpendUsd: number;
  tierKey: string;
  topCategoryLabel: string;
  topTools: string[];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBrutalBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  shadowOffset = 10
) {
  // Hard black offset shadow
  drawRoundedRect(ctx, x + shadowOffset, y + shadowOffset, w, h, r);
  ctx.fillStyle = "#000000";
  ctx.fill();

  // Main box with thick black stroke
  drawRoundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#000000";
  ctx.stroke();
}

export function renderShareCardDataUrl(payload: ShareCardPayload): string {
  const W = 1200;
  const H = 1500;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const isZh = payload.locale === "zh";
  const tier = TIER_COPY[payload.locale][payload.tierKey] ?? TIER_COPY[payload.locale].minimalist;
  const fontStack =
    "'Space Grotesk', Inter, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const monoStack = "'JetBrains Mono', ui-monospace, monospace";

  // Neo-Brutalism Warm Buttercream Background
  ctx.fillStyle = "#FFF8E7";
  ctx.fillRect(0, 0, W, H);

  // Subtle retro dot texture
  ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
  for (let dx = 30; dx < W; dx += 36) {
    for (let dy = 30; dy < H; dy += 36) {
      ctx.beginPath();
      ctx.arc(dx, dy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Main outer brutalist white frame
  drawBrutalBox(ctx, 64, 64, W - 140, H - 140, 36, "#FFFFFF", 14);

  // Brand icon ($)
  drawBrutalBox(ctx, 120, 120, 72, 72, 18, "#FFE500", 6);
  ctx.fillStyle = "#000000";
  ctx.font = `900 40px ${monoStack}`;
  ctx.fillText("$", 143, 170);

  // Brand name: OhMyMoney
  ctx.fillStyle = "#000000";
  ctx.font = `900 38px ${fontStack}`;
  ctx.fillText("OhMyMoney", 214, 168);

  // Tier pill (#00E599 mint)
  ctx.font = `800 26px ${fontStack}`;
  const pillText = tier.badge;
  const pillW = ctx.measureText(pillText).width + 52;
  drawBrutalBox(ctx, W - 134 - pillW, 126, pillW, 56, 16, "#00E599", 6);
  ctx.fillStyle = "#000000";
  ctx.fillText(pillText, W - 134 - pillW + 26, 163);

  // Divider line
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(120, 224);
  ctx.lineTo(W - 134, 224);
  ctx.stroke();

  // Headline
  ctx.fillStyle = "#000000";
  ctx.font = `900 58px ${fontStack}`;
  ctx.fillText(isZh ? "我的 AI 订阅体检账单" : "My AI Spend Receipt", 120, 312);

  // Roast subtitle
  ctx.fillStyle = "#3f3f46";
  ctx.font = `600 28px ${fontStack}`;
  const words = isZh ? tier.roast.split("") : tier.roast.split(" ");
  let line = "";
  let y = 372;
  for (const w of words) {
    const test = line + (isZh ? w : (line ? " " : "") + w);
    if (ctx.measureText(test).width > W - 260) {
      ctx.fillText(line, 120, y);
      line = w;
      y += 42;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 120, y);

  // 2x2 Neo-Brutalism Color-Blocked KPI Grid
  const gridY = 474;
  const boxW = (W - 254 - 32) / 2;
  const boxH = 224;
  const metrics = [
    {
      label: isZh ? "月均 AI 总支出" : "MONTHLY TOTAL",
      value: formatMoney(payload.monthlyUsd, payload.currency),
      bg: "#FFE500",
      fg: "#000000",
      sub: "#000000",
    },
    {
      label: isZh ? "年化账单预估" : "ANNUALIZED",
      value: formatMoney(payload.yearlyUsd, payload.currency),
      bg: "#FFFFFF",
      fg: "#000000",
      sub: "#52525b",
    },
    {
      label: isZh ? "在用订阅工具" : "ACTIVE TOOLS",
      value: isZh
        ? `${payload.subCount} 款${payload.apiSpendUsd > 0 ? " + API" : ""}`
        : `${payload.subCount} tools${payload.apiSpendUsd > 0 ? " + API" : ""}`,
      bg: "#3B82F6",
      fg: "#FFFFFF",
      sub: "#FFFFFF",
    },
    {
      label: isZh ? "体检可省 / 月" : "POTENTIAL SAVINGS",
      value: formatMoney(payload.savingsUsd, payload.currency),
      bg: "#FF5C5C",
      fg: "#FFE500",
      sub: "#FFFFFF",
    },
  ];

  metrics.forEach((m, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 120 + col * (boxW + 32);
    const by = gridY + row * (boxH + 32);
    drawBrutalBox(ctx, bx, by, boxW, boxH, 24, m.bg, 10);

    ctx.fillStyle = m.sub;
    ctx.font = `800 24px ${fontStack}`;
    ctx.fillText(m.label, bx + 32, by + 64);

    ctx.fillStyle = m.fg;
    ctx.font = `900 54px ${monoStack}`;
    ctx.fillText(m.value, bx + 32, by + 156);
  });

  // Top category & active stack box
  const stackY = 996;
  drawBrutalBox(ctx, 120, stackY, W - 254, 250, 24, "#FFF8E7", 10);

  ctx.fillStyle = "#52525b";
  ctx.font = `800 22px ${fontStack}`;
  ctx.fillText(isZh ? "最大支出分类" : "TOP SPEND CATEGORY", 156, stackY + 60);

  ctx.fillStyle = "#000000";
  ctx.font = `900 34px ${fontStack}`;
  ctx.fillText(payload.topCategoryLabel, 156, stackY + 112);

  ctx.fillStyle = "#52525b";
  ctx.font = `800 22px ${fontStack}`;
  ctx.fillText(isZh ? "主要在用工具" : "TOP ACTIVE TOOLS", 156, stackY + 168);

  ctx.fillStyle = "#18181b";
  ctx.font = `700 26px ${fontStack}`;
  const toolsLine = payload.topTools.slice(0, 5).join(" · ") || (isZh ? "暂无" : "None");
  ctx.fillText(toolsLine.slice(0, 48), 156, stackY + 212);

  // Footer
  ctx.fillStyle = "#000000";
  ctx.font = `800 26px ${fontStack}`;
  ctx.fillText(
    isZh
      ? "OhMyMoney · AI 订阅算账 · 高性价比搭配 · 省钱情报"
      : "OhMyMoney · AI Spend Tracker · Smart Bundles · Verified Deals",
    120,
    H - 124
  );

  return canvas.toDataURL("image/png");
}
