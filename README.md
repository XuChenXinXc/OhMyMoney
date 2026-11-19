# OhMyMoney — AI 订阅算账 · 高性价比搭配 · 省钱情报

基于 **Next.js 15 (App Router) + TypeScript + Tailwind CSS + Prisma + Recharts** 构建的免登录、本地优先 AI 订阅成本管理与省钱优化工具，采用高辨识度的 **潮流波普风（Neo-Brutalism Pop）** 界面设计。

## 核心功能

1. **我的订阅配置（默认空白初始化 + 本地记忆）**
   - 内置 2026 国内外主流 AI 工具价格库（ChatGPT、Claude、Gemini、Cursor、GitHub Copilot、Perplexity、Midjourney、Runway、Suno、ElevenLabs、Notion AI、Kimi、DeepSeek、豆包、通义千问等）。
   - 支持关键词搜索、地区/分类筛选、添加自定义订阅，以及按当前币种（USD / CNY / JPY）直接修改实付价、切换月付/年付、标记使用频率、设置续费日与一键清空。
   - 首次进入为空白状态，勾选与配置自动持久化到浏览器 `localStorage`，支持 JSON 本地备份导出与恢复。

2. **账单与数据看板**
   - 实时汇总月均总支出、年化支出、预算使用率进度条与支出排行 Top 订阅。
   - 内置 **未来 7 天即将扣费提醒条**，并支持一键导出标准 `.ics` 续费提醒日历（兼容 Apple / Google / Outlook 日历）。
   - 提供 3 张交互式 Recharts 图表：各类别支出占比环形图、当前 vs 优化后 vs 预算对比柱状图、12 个月累计支出预测面积图。

3. **浪费体检与波普风晒单**
   - 自动检测同类旗舰重叠订阅、低频闲置会员及年付折扣差价（按工具去重计费，避免重复累加），提供一键移除或切换年付。
   - 内置 1200×1500 高分 Canvas 引擎一键导出 **潮流波普风 PNG 晒单图**，并支持生成中英双语公开分享短链（`/s/[slug]`）。

4. **社区公认高性价比搭配 + API 临界点测算**
   - 覆盖独立开发者、内容创作者、学生/科研、日常办公、国内极省组合 5 大角色，按目标预算自动推荐无重叠主流搭配并支持一键套用。
   - 内置「$20 包月会员 vs 按量 API」临界点滑块测算器。

5. **省钱情报站（支持自动抓取更新）**
   - 聚合教育优惠、年付折扣、国产平替与开源方案，支持社区提交价格变动纠错（`POST /api/feedback`）。
   - 内置实时同步接口 `/api/deals/sync`（整合 Hacker News 与官方博客 RSS），配合 `vercel.json` 每日定时自动更新。

6. **全站双语、实时汇率与暗黑模式**
   - 顶部支持 `中文 / English` 下拉切换、`USD / CNY / JPY` 实时汇率换算（`/api/rates` 24 小时缓存 + 离线兜底）以及亮色/暗黑主题切换。

## 快速开始

### 方式一：Windows 一键启动（推荐）

1. 确保电脑已安装 **Node.js 20 LTS**（[nodejs.org](https://nodejs.org)）。
2. 解压项目后，直接双击根目录的 **`start-windows.bat`**。
3. 脚本会自动完成 `.env` 创建、依赖安装（自动兼容 React 19）、SQLite 数据库初始化与种子数据写入，并自动打开浏览器访问 `http://localhost:3000`。

### 方式二：命令行手动启动（macOS / Linux / Windows）

```bash
# 1. 安装依赖（项目已内置 .npmrc 处理 React 19 peer deps）
npm install

# 2. 复制环境变量
cp .env.example .env

# 3. 生成 Prisma Client、初始化本地 SQLite 数据库并写入种子数据
npx prisma generate
npx prisma db push
npm run db:seed

# 4. 启动开发服务器
npm run dev
```

启动后访问 `http://localhost:3000`。

## 环境变量说明

在 `.env` 中配置以下变量（本地开发可直接沿用 `.env.example`）：

| 变量名 | 必填 | 默认值 / 说明 |
| :--- | :--- | :--- |
| `DATABASE_URL` | 是 | 本地默认 `file:./dev.db`（SQLite）；生产环境可换为 PostgreSQL 连接串 |
| `NEXT_PUBLIC_SITE_URL` | 否 | 生产环境站点域名（如 `https://ohmymoney.money`）；本地 `localhost` 会自动使用当前地址 |
| `CRON_SECRET` | 否 | 生产环境 Vercel Cron 鉴权密钥；配置后 `GET /api/deals/sync` 需携带 `Authorization: Bearer <CRON_SECRET>` |

## 后端 API 接口一览

| 接口 | 方法 | 说明 |
| :--- | :--- | :--- |
| `/api/tools` | `GET` | 获取 AI 工具价格库与省钱情报（数据库未初始化时自动回退内置种子数据） |
| `/api/rates` | `GET` | 获取实时 `USD / CNY / JPY` 汇率（24 小时服务端缓存 + 离线兜底） |
| `/api/shares` | `POST` | 创建匿名账单快照并返回公开分享短链（支持保存 `locale` 语言） |
| `/api/shares/[slug]` | `GET` | 按短链标识读取分享账单 JSON 数据 |
| `/api/deals/sync` | `POST` / `GET` | 拉取最新 AI 定价与优惠动态并写入 `DealItem` 表（`GET` 供 Vercel Cron 定时调用） |
| `/api/feedback` | `GET` / `POST` | 查询或提交工具价格变动与新优惠线索 |

## 目录结构

```text
OhMyMoney/
├── prisma/
│   ├── schema.prisma          # 数据模型（AiTool / DealItem / PriceFeedback / SharedReport）
│   └── seed.ts                # 2026 工具与情报初始化种子脚本
├── src/
│   ├── app/
│   │   ├── api/               # tools / rates / shares / deals/sync / feedback 接口
│   │   ├── s/[slug]/page.tsx  # 中英双语公开分享账单页
│   │   ├── globals.css        # 潮流波普风基础样式与暗黑模式变量
│   │   ├── layout.tsx         # 根布局、字体与 SEO Metadata
│   │   └── page.tsx           # 服务端首屏数据加载入口
│   ├── components/            # AppShell / CatalogPicker / AnalyticsCharts / AuditPanel / RecommendPanel / DealsPanel
│   └── lib/                   # catalog / diagnostics / i18n / exportIcs / renderShareCard / prisma
├── .npmrc                     # 自动启用 legacy-peer-deps 兼容 React 19
├── start-windows.bat          # Windows 双击一键启动脚本
└── vercel.json                # 每日 UTC 02:00 定时同步省钱情报配置
```

## 部署到 Vercel

1. 将项目代码推送到 GitHub 仓库。
2. 如需在生产环境持久化分享短链、反馈与定时同步的情报，在 Supabase 或 Neon 创建一个免费 PostgreSQL 数据库，并将 `prisma/schema.prisma` 中的 `provider = "sqlite"` 修改为 `provider = "postgresql"`。
3. 在 Vercel 导入仓库，配置 `DATABASE_URL`、`NEXT_PUBLIC_SITE_URL` 与可选的 `CRON_SECRET` 环境变量后点击部署即可自动启用每日定时任务。
