"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation"; // ✅ 1. 引入 usePathname
import { NotificationBell } from "@/components/ui/NotificationBell";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Music2 } from "lucide-react";

export function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname(); // ✅ 2. 取得目前路徑

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // 登入檢查邏輯維持不變...
    async function getUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          const { data, error } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle(); 
          if (!error && data) {
            setProfile(data);
          }
        }
      } catch (e) {
        console.error("Header load error:", e);
      }
    }
    getUserData();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // ✅ 3. 如果是在首頁 (Landing Page) 或登入頁，就不渲染這個 Header
  // 你可以依需求增加不想顯示的頁面，例如 "/login", "/signup"
  if (pathname === "/" || pathname === "/login"|| pathname?.startsWith("/invite")) {
    return null;
  }

  if (!mounted) return <header className="h-16 bg-zinc-950 border-b border-zinc-800" />;

  return (
    // ... 原本的 Header JSX 內容維持不變 ...
    <header className="flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 sticky top-0 z-50">
      {/* 左側 Logo */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-white tracking-wider hover:text-blue-400 transition-colors">
          <div className="p-1.5 bg-blue-600 rounded-lg">
            <Music2 className="w-4 h-4 text-white" />
          </div>
          VersionVibe
        </Link>
      </div>

      {/* 右側功能區 */}
      <div className="flex items-center gap-4">
        <NotificationBell />

        <div className="h-4 w-[1px] bg-zinc-800" />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 border border-zinc-700 hover:border-zinc-500 focus:ring-0">
                <Avatar className="h-full w-full">
                  <AvatarImage src={profile?.avatar_url || user.user_metadata?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                    {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-zinc-300 shadow-2xl" align="end">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-white truncate">
                    {profile?.display_name || user.user_metadata?.full_name || "使用者"}
                  </p>
                  <p className="text-xs leading-none text-zinc-500 truncate">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              
              <DropdownMenuItem asChild className="cursor-pointer focus:bg-zinc-900 focus:text-white p-2">
                <Link href="/profile" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>基本資料設定</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-zinc-800" />
              
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-950/20 p-2"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>登出</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/login">
            <Button size="sm" className="bg-zinc-100 text-black hover:bg-zinc-200">登入</Button>
          </Link>
        )}
      </div>
    </header>
  );
}