"use client";

import { cn } from "@/lib/utils";
import { Clock, MoreVertical, BarChart2 } from "lucide-react";
import { Button } from "./ui/button";

interface Version {
  id: string;
  version_number: number;
  name: string;
  created_at: string;
  storage_path: string;
  // 這裡未來會加上 lufs, tp 等真實資料
}

interface VersionListProps {
  versions: Version[];
  currentVersionId: string | null;
  isPlaying: boolean;
  onVersionSelect: (version: Version) => void;
}

export function VersionList({
  versions,
  currentVersionId,
  isPlaying,
  onVersionSelect,
}: VersionListProps) {
  return (
    <div className="bg-[#0d0e14] p-4 rounded-b-xl border border-t-0 border-zinc-800/50">
      <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-4 px-2">
        Versions
      </h2>
      <div className="grid gap-3">
        {versions.map((version) => {
          const isSelected = currentVersionId === version.id;

          return (
            <div
              key={version.id}
              onClick={() => onVersionSelect(version)}
              // 使用 cn 來動態組合樣式，實現選中時的紫色邊框效果
              className={cn(
                "group flex justify-between items-center p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden",
                isSelected
                  ? "bg-[#1a1b26] border-[#3D3DFF]/50 shadow-[inset_0_0_0_1px_rgba(61,61,255,0.2)]"
                  : "bg-[#12141c] border-zinc-800/60 hover:bg-[#161821] hover:border-zinc-700"
              )}
            >
              {/* 選中時左側的紫色光條 */}
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3D3DFF]" />
              )}

              <div className="flex items-center gap-4 ml-2">
                {/* 版本號 Badge */}
                <div
                  className={cn(
                    "h-8 w-10 rounded flex items-center justify-center font-mono font-bold text-sm",
                    isSelected
                      ? "bg-[#3D3DFF] text-white"
                      : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-300"
                  )}
                >
                  V{version.version_number}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "font-bold text-base",
                        isSelected ? "text-white" : "text-zinc-300"
                      )}
                    >
                      {version.name}
                    </p>
                    <span className="text-zinc-600 mx-1">•</span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(version.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Loudness Stats (Placeholder Data) */}
                  <div className="flex items-center gap-4 mt-1 text-xs font-mono font-medium text-zinc-500">
                    {/* 這裡未來要放真實資料 */}
                    <span className={isSelected ? "text-blue-300/70" : ""}>I: -14.5 LUFS</span>
                    <span className={isSelected ? "text-blue-300/70" : ""}>TP: -0.5</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* 播放中的動態圖示 */}
                {isSelected && isPlaying && (
                   <BarChart2 className="h-5 w-5 text-[#3D3DFF] animate-pulse" />
                )}

                {/* 更多選項按鈕 */}
                <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}