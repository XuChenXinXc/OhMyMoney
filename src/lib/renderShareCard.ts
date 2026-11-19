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
  const fontStack = "Inter, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif";

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#020617");
  bg.addColorStop(0.55, "#0f172a");
  bg.addColorStop(1, "#064e3b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle decorative glow
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.12, 20, W * 0.85, H * 0.12, 420);
  glow.addColorStop(0, "rgba(16, 185, 129, 0.28)");
  glow.addColorStop(1, "rgba(16, 185, 129, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Outer card frame
  drawRoundedRect(ctx, 72, 72, W - 144, H - 144, 48);
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(52, 211, 153, 0.25)";
  ctx.stroke();

  // Brand header
  ctx.fillStyle = "#34d399";
  ctx.font = `800 34px ${fontStack}`;
  ctx.fillText("OHMYMONEY.MONEY", 136, 174);

  // Tier pill
  ctx.font = `700 28px ${fontStack}`;
  const pillText = tier.badge;
  const pillW = ctx.measureText(pillText).width + 56;
  drawRoundedRect(ctx, W - 136 - pillW, 130, pillW, 56, 28);
  ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
  ctx.fill();
  ctx.strokeStyle = "rgba(52, 211, 153, 0.45)";
  ctx.stroke();
  ctx.fillStyle = "#6ee7b7";
  ctx.fillText(pillText, W - 136 - pillW + 28, 168);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 62px ${fontStack}`;
  ctx.fillText(isZh ? "我的 AI 订阅体检账单" : "My AI Spend Receipt", 136, 285);

  // Roast subtitle (wrap cleanly)
  ctx.fillStyle = "#cbd5e1";
  ctx.font = `500 30px ${fontStack}`;
  const words = isZh ? tier.roast.split("") : tier.roast.split(" ");
  let line = "";
  let y = 352;
  for (const w of words) {
    const test = line + (isZh ? w : (line ? " " : "") + w);
    if (ctx.measureText(test).width > W - 272) {
      ctx.fillText(line, 136, y);
      line = w;
      y += 46;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 136, y);

  // 2x2 KPI Grid
  const gridY = 468;
  const boxW = (W - 272 - 32) / 2;
  const boxH = 220;
  const metrics = [
    {
      label: isZh ? "月均 AI 总支出" : "MONTHLY AI SPEND",
      value: formatMoney(payload.monthlyUsd, payload.currency),
      color: "#ffffff",
    },
    {
      label: isZh ? "年化账单预估" : "ANNUALIZED SPEND",
      value: formatMoney(payload.yearlyUsd, payload.currency),
      color: "#34d399",
    },
    {
      label: isZh ? "在用订阅工具" : "ACTIVE TOOLS",
      value: isZh
        ? `${payload.subCount} 款${payload.apiSpendUsd > 0 ? " + API" : ""}`
        : `${payload.subCount} tools${payload.apiSpendUsd > 0 ? " + API" : ""}`,
      color: "#f8fafc",
    },
    {
      label: isZh ? "体检可立即省下 / 月" : "POTENTIAL SAVINGS / MO",
      value: formatMoney(payload.savingsUsd, payload.currency),
      color: "#fbbf24",
    },
  ];

  metrics.forEach((m, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 136 + col * (boxW + 32);
    const by = gridY + row * (boxH + 32);
    drawRoundedRect(ctx, bx, by, boxW, boxH, 32);
    ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = `600 26px ${fontStack}`;
    ctx.fillText(m.label, bx + 36, by + 68);

    ctx.fillStyle = m.color;
    ctx.font = `800 58px ${fontStack}`;
    ctx.fillText(m.value, bx + 36, by + 158);
  });

  // Top category & stack list
  const stackY = 986;
  drawRoundedRect(ctx, 136, stackY, W - 272, 260, 32);
  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
  ctx.stroke();

  ctx.fillStyle = "#94a3b8";
  ctx.font = `600 26px ${fontStack}`;
  ctx.fillText(isZh ? "最大支出分类" : "TOP SPEND CATEGORY", 176, stackY + 64);

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 36px ${fontStack}`;
  ctx.fillText(payload.topCategoryLabel, 176, stackY + 118);

  ctx.fillStyle = "#94a3b8";
  ctx.font = `600 24px ${fontStack}`;
  ctx.fillText(isZh ? "主要在用工具" : "TOP ACTIVE TOOLS", 176, stackY + 178);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = `500 28px ${fontStack}`;
  const toolsLine = payload.topTools.slice(0, 5).join(" · ") || (isZh ? "暂无" : "None");
  ctx.fillText(toolsLine.slice(0, 48), 176, stackY + 222);

  // Footer
  ctx.fillStyle = "#64748b";
  ctx.font = `600 26px ${fontStack}`;
  ctx.fillText(
    isZh
      ? "测测你的 AI 账单花了多少 → https://ohmymoney.money"
      : "Audit your AI subscriptions → https://ohmymoney.money",
    136,
    H - 132
  );

  return canvas.toDataURL("image/png");
}
