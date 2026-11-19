import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ohmymoney.money";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ohmymoney.money — AI Subscription Cost Tracker & Smart Optimizer",
    template: "%s | ohmymoney.money",
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
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen`}>{children}</body>
    </html>
  );
}
