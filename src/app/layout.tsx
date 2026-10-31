import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://zyuuuukak1n.dev"),
  title: "AI Interviewer | 新卒就活生向けリアルタイムAI模擬面接＆フィードバック",
  description:
    "志望企業のURLや求人票からAI面接官ペルソナを動的生成。Gemini 3.8 Liveによる超低遅延音声対話と鋭い深掘り、5軸レーダーチャートによる実践的フィードバックを提供します。",
  openGraph: {
    title: "AI Interviewer | 新卒就活生向けリアルタイムAI模擬面接＆フィードバック",
    description:
      "志望企業のURLや求人票からAI面接官ペルソナを動的生成。Gemini 3.8 Liveによる音声対話と5軸スコアフィードバック。",
    url: "https://zyuuuukak1n.dev/tools/ai-interviewer",
    siteName: "AI Interviewer",
    images: [
      {
        url: "https://zyuuuukak1n.dev/tools/ai-interviewer/ogp.png",
        width: 1200,
        height: 630,
        alt: "AI Interviewer OGP",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Interviewer | 新卒就活生向けリアルタイムAI模擬面接＆フィードバック",
    description:
      "志望企業のURLや求人票からAI面接官ペルソナを動的生成。Gemini 3.8 Liveによる音声対話と5軸スコアフィードバック。",
    images: ["https://zyuuuukak1n.dev/tools/ai-interviewer/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100 antialiased flex flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
          <p>© 2026 じゅーかきん (zyuuuukak1n). All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
