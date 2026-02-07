"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, MessageCircle } from "lucide-react"; // 移除 Activity (因為按鈕刪掉了)
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Comment {
  id: string;
  content: string;
  timestamp: number;
}

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  currentVersionName: string | undefined;
  currentTime: number;
  duration: number;
  onSeek: (value: number) => void;
  comments?: Comment[];
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" + s : s}`;
}

export function PlayerControls({
  isPlaying,
  onPlayPauseToggle,
  currentVersionName,
  currentTime,
  duration,
  onSeek,
  comments = [],
}: PlayerControlsProps) {
  return (
    <TooltipProvider>
      {/* ✨ 修改重點：
         1. 移除了 bg-[#12141c], border, p-6
         2. 改為 w-full，讓它變成一個純粹的內容元件，外觀由 TrackPlayer 的卡片決定
      */}
      <div className="w-full">
        {/* Top Bar: Controls & Metadata */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <Button
              onClick={onPlayPauseToggle}
              size="icon"
              className="h-16 w-16 rounded-full bg-[#3D3DFF] hover:bg-[#3333d9] shadow-[0_0_20px_rgba(61,61,255,0.3)] transition-transform active:scale-95"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 fill-current text-white" />
              ) : (
                <Play className="h-8 w-8 fill-current text-white ml-1" />
              )}
            </Button>

            <div className="space-y-1">
              <div className="font-mono text-2xl font-bold tracking-tight">
                <span className="text-white">{formatTime(currentTime)}</span>
                <span className="text-zinc-600 mx-2">/</span>
                <span className="text-zinc-500">{formatTime(duration)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-blue-400 tracking-wider uppercase">
                <span>{isPlaying ? "Playing" : "Paused"}</span>
                <span className="text-zinc-600">•</span>
                <span>{currentVersionName || "No version selected"}</span>
              </div>
            </div>
          </div>

          {/* 🗑️ 已移除：Loudness Match Off 按鈕
          */}
        </div>

        {/* Waveform Area & Timeline Markers */}
        <div className="relative h-24 bg-[#0a0b10] rounded-lg border border-zinc-800/50 group">
          
          {/* 1. 視覺波形 (背景層) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none">
            <div className="flex items-end gap-[2px] h-1/2 w-full px-4">
              {Array.from({ length: 100 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 rounded-full ${((i/100) * duration < currentTime) ? 'bg-blue-500' : 'bg-zinc-600'}`} 
                  style={{ height: `${(20 + Math.abs(Math.sin(i * 123)) * 80).toFixed(2)}%` }}
                />
              ))}
            </div>
          </div>

          {/* 2. 留言標籤層 (Markers) */}
          <div className="absolute inset-0 px-4 pointer-events-none">
            <div className="relative w-full h-full">
              {comments.map((comment) => {
                const position = (comment.timestamp / duration) * 100;
                return (
                  <div
                    key={comment.id}
                    className="absolute top-0 bottom-0 w-[2px] bg-blue-500/30 group-hover:bg-blue-500/50 transition-colors"
                    style={{ left: `${position}%` }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeek(comment.timestamp);
                          }}
                          className="absolute top-2 -translate-x-1/2 p-1 bg-blue-600 hover:bg-white text-white hover:text-blue-600 rounded-full shadow-lg transition-all pointer-events-auto active:scale-90"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-zinc-800 border-zinc-700 text-white text-[10px]">
                        <p>{comment.content}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 3. 進度條 Slider (最上層) */}
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onValueChange={(val) => onSeek(val[0])}
          />

          {/* 4. 當前播放指示線 (視覺提示) */}
          <div 
            className="absolute top-0 bottom-0 w-[1px] bg-white z-20 pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />

          {!currentVersionName && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-40">
              <p className="text-zinc-400 font-medium">Select a version to start</p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}