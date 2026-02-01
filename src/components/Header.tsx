"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/ui/NotificationBell"; // 確保路徑正確
// 假設你有一個 UserMenu 或 Avatar 組件，如果沒有先留空或放個假圖
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; 

export function Header() {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      {/* 左側 Logo */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-lg font-bold text-white tracking-wider hover:text-blue-400 transition-colors">
          VersionVibe
        </Link>
      </div>

      {/* 右側功能區 */}
      <div className="flex items-center gap-4">
        {/* 1. 通知鈴鐺放這裡 */}
        <NotificationBell />

        {/* 2. 分隔線 (選用) */}
        <div className="h-4 w-[1px] bg-zinc-800" />

        {/* 3. 使用者頭像 (示意) */}
        <Avatar className="h-8 w-8 cursor-pointer border border-zinc-700 hover:border-zinc-500">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}