"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

// ✅ 統一定義 Version 型別，確保與 TrackPlayer 一致
interface Version {
  id: string;
  version_number: number;
  name: string;
  created_at: string;
  storage_path: string;
  // ✅ 必須定義為陣列物件格式
  comment_count?: { count: number }[];
}

interface VersionListProps {
  versions: Version[];
  currentVersionId: string | null;
  isPlaying: boolean;
  onVersionSelect: (version: Version) => void;
  className?: string;
}

export function VersionList({
  versions,
  currentVersionId,
  onVersionSelect,
  className,
}: VersionListProps) {
  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {versions.map((version) => {
        const isActive = currentVersionId === version.id;

        // ✅ 核心修正：從 [{ count: n }] 陣列中提取數字
        // 這樣就能解決 "Type '{ count: number; }[]' is not assignable to type 'number'" 的錯誤
        const count = version.comment_count?.[0]?.count || 0;

        return (
          <Button
            key={version.id}
            variant="outline"
            onClick={() => onVersionSelect(version)}
            className={cn(
              "w-full h-11 px-4 transition-all duration-200 border text-xs",
              "rounded-md flex items-center justify-between",
              isActive
                ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-sm"
                : "bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            )}
          >
            {/* 左側：檔名 */}
            <span className="truncate font-medium mr-4">
              {version.name}
            </span>

            {/* 右側：留言數顯示 */}
            <div className={cn(
              "flex items-center gap-1.5 shrink-0",
              isActive ? "text-blue-400" : "text-zinc-600"
            )}>
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px]">
                {count} 則留言
              </span>
            </div>
          </Button>
        );
      })}
    </div>
  );
}