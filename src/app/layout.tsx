import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jetbrains-mono",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ohmymoney.money";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OhMyMoney — AI 订阅算账 · 高性价比搭配 · 省钱情报",
    template: "%s | OhMyMoney",
  },
  description:
    "Track your monthly AI subscriptions (ChatGPT, Claude, Gemini, Cursor, Kimi, DeepSeek & more), spot overlapping spend, generate shareable PNG receipts, and discover high-value AI bundles. Zero login required.",
  keywords: [
    "AI subscription tracker",
    "AI cost calculator",
    "ChatGPT Claude Gemini pricing",
    "AI 订阅管理",
    "AI 省钱推荐",
    "ohmymoney",
  ],
  openGraph: {
    title: "ohmymoney.money — Audit Your AI Subscriptions",
    description:
      "See how much you really spend on AI every month, catch overlapping subscriptions, and get smarter value recommendations.",
    url: SITE_URL,
    siteName: "ohmymoney.money",
    type: "website",
    locale: "zh_CN",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ohmymoney.money — AI Subscription Cost Optimizer",
    description: "Zero-login AI subscription audit, overlap detector & PNG receipt generator.",
  },
  icons: {
    icon: [{ url: "/favicon.svg?v=2", type: "image/svg+xml" }],
    shortcut: "/favicon.svg?v=2",
    apple: "/favicon.svg?v=2",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="scroll-smooth">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
