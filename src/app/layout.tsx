import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header"; 
import { Toaster } from "sonner"; 
// ✅ 1. 引入 Supabase 與 Context
import { createClient } from "@/utils/supabase/server";
import { UserProjectsProvider } from "@/context/UserProjectsContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VersionVibe",
  description: "Music Collaboration Platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// ✅ 2. 改成 async function 以支援伺服器端請求
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ✅ 3. 在根目錄獲取資料 (Pre-fetch)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let safeMemberships: any[] = [];

  // 只有當使用者已登入時才去抓資料，避免影響登入頁面
  if (user) {
    const { data: memberships } = await supabase
      .from("project_members")
      .select(`
        id,
        project_id,
        role,
        display_name,
        avatar_url,
        projects (
          id,
          name
        )
      `)
      .eq("user_id", user.id);
    
    safeMemberships = memberships || [];
  }

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white`}>
        {/* ✅ 4. 用 Provider 包裹整個內容，讓 Header 和所有頁面都能秒讀資料 */}
        <UserProjectsProvider data={safeMemberships}>
          {/* 放置 Header */}
          <Header />
          
          {/* 主要內容區 */}
          <main className="min-h-[calc(100vh-64px)]">
            {children}
          </main>

          <Toaster position="top-center" />
        </UserProjectsProvider>
      </body>
    </html>
  );
}