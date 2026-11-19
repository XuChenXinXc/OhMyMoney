# ohmymoney.money — AI 订阅成本体检与性价比推荐平台 (V2 全栈工程版)

基于 **Next.js 15 (App Router) + TypeScript + Tailwind CSS + Prisma + Recharts** 构建的完整全栈独立开发项目。

## 核心特性

1. **免登录零摩擦 + 真实后端 API**：
   - 用户个人账单默认本地 `localStorage` 持久保存，无需注册账密、不碰银行卡敏感信息。
   - 真实后端 API 支撑工具价格库 (`GET /api/tools`)、社区价格纠错投稿入库 (`POST /api/feedback`) 与可访问的公开账单分享短链 (`POST /api/shares` + `/s/[slug]`)。
2. **国内外 AI 工具双语价格库**：内置 19 款 2026 公开核验的海外（ChatGPT、Claude、Gemini、Cursor、Copilot、Perplexity、Midjourney、Runway、Suno 等）与国内（Kimi Go/Plus/Pro、DeepSeek、豆包、通义千问）主流 AI 工具。
3. **商业级 SaaS 界面与多维数据看板**：支持亮色/暗黑模式切换、中英双语（`zh`/`en`）切换、多币种汇率换算（USD/CNY/JPY），以及 Recharts 类别环形图、当前 vs 优化 vs 预算对比柱状图和 12 个月累计支出预测面积图。
4. **高清 PNG 晒单图 + 续费日历导出**：内置 1200×1500 高分 Canvas 绘图引擎一键下载 PNG 诊断战报，并支持导出 `.ics` 续费提醒日历和 JSON 本地备份。

## 本地快速启动

```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量
cp .env.example .env

# 3. 初始化本地 SQLite 数据库并写入 2026 价格库种子数据
npx prisma db push
npx prisma db seed

# 4. 启动开发服务器
npm run dev
```

启动后访问 `http://localhost:3000`。

## 部署到 Vercel 并绑定 ohmymoney.money

1. 将代码推送到 GitHub 仓库。
2. 如果需要生产环境持久化数据库（存反馈与分享短链），在 [Supabase](https://supabase.com) 或 [Neon](https://neon.tech) 免费创建一个 PostgreSQL 数据库，将 `prisma/schema.prisma` 中的 `provider = "sqlite"` 改为 `provider = "postgresql"`。
3. 在 Vercel 导入仓库，配置环境变量 `DATABASE_URL` 和 `NEXT_PUBLIC_SITE_URL="https://ohmymoney.money"`，点击 Deploy 并在 Domains 中绑定 `ohmymoney.money`。
