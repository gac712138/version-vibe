import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header"; // 引入剛剛建立的 Header
import { Toaster } from "sonner"; // 順便確認你有加 Toast


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VersionVibe",
  description: "Music Collaboration Platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // 🚫 禁止使用者縮放
  // themeColor: "#000000", // (選填) 設定手機瀏覽器網址列顏色
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white`}>
        {/* 放置 Header */}
        <Header />
        
        {/* 主要內容區 */}
        <main className="min-h-[calc(100vh-64px)]">
          {children}
        </main>

        <Toaster position="top-center" />
      </body>
    </html>
  );
}