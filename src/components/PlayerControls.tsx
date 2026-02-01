"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Activity } from "lucide-react";

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  currentVersionName: string | undefined;
  currentTime: number;
  duration: number;
  // 👇 1. 新增這個定義：接收拖動數值的函式
  onSeek: (value: number) => void;
}

// 輔助函式：將秒數格式化為 MM:SS
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
  // 👇 2. 記得把 onSeek 解構出來
  onSeek,
}: PlayerControlsProps) {
  return (
    <div className="bg-[#12141c] rounded-t-xl p-6 border-b border-zinc-800/50">
      {/* Top Bar: Controls & Metadata */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          {/* Big Play Button */}
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

          {/* Time & Status Info */}
          <div className="space-y-1">
            <div className="font-mono text-2xl font-bold tracking-tight">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="text-zinc-600 mx-2">/</span>
              <span className="text-zinc-500">{formatTime(duration)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-blue-400 tracking-wider uppercase">
              <span>{isPlaying ? "Playing" : "Paused"}</span>
              <span className="text-zinc-600">•</span>
              {/* 這裡未來要放真實的 Sample Rate 資料 */}
              <span>48kHz 24bit</span>
            </div>
          </div>
        </div>

        {/* Loudness Toggle (Placeholder) */}
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 gap-2 text-xs font-bold tracking-wider"
        >
          <Activity className="h-4 w-4" />
          LOUDNESS MATCH OFF
        </Button>
      </div>

      {/* Waveform Area (Placeholder) */}
      <div className="relative h-24 bg-[#0a0b10] rounded-lg overflow-hidden border border-zinc-800/50 flex items-center justify-center group cursor-pointer">
        {/* 這裡未來會是真的波形圖，現在先用 CSS 模擬一個假象 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity">
          {/* 產生一排假的波形條 */}
          <div className="flex items-end gap-[2px] h-1/2 w-full px-4">
            {Array.from({ length: 100 }).map((_, i) => {
              // 隨機產生高度，模擬波形
              const height = Math.max(10, Math.random() * 100);
              return (
                <div key={i} className="flex-1 bg-zinc-600 rounded-full" style={{ height: `${height}%` }}></div>
              )
            })}
          </div>
        </div>
        
        {/* 進度條 Slider (疊在波形上面) */}
        <Slider
          defaultValue={[0]}
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          className="absolute inset-0 z-10 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          // 👇 3. 這裡把註解拿掉，實作 Seek 功能
          onValueChange={(val) => onSeek(val[0])}
        />

        {/* 尚未選擇版本時的提示 */}
        {!currentVersionName && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
            <p className="text-zinc-400 font-medium">Select a version to start</p>
          </div>
        )}
      </div>
    </div>
  );
}