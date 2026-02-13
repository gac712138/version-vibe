"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, MessageCircle, Volume2, VolumeX } from "lucide-react"; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  onMuteToggle: () => void;
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
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
}: PlayerControlsProps) {
  const [showPercent, setShowPercent] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleVolumeChange = (val: number[]) => {
    onVolumeChange(val[0]);
    setShowPercent(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleVolumeCommit = () => {
    timerRef.current = setTimeout(() => {
      setShowPercent(false);
    }, 1000);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <TooltipProvider>
      <div className="w-full space-y-4 md:space-y-0">
        {/* Top Bar: 播放鈕、時間與音量控制 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-6">
            <Button
              onClick={onPlayPauseToggle}
              size="icon"
              className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95 shrink-0"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 md:h-8 md:w-8 fill-current text-white" />
              ) : (
                <Play className="h-6 w-6 md:h-8 md:w-8 fill-current text-white ml-1" />
              )}
            </Button>

            <div className="space-y-0.5 md:space-y-1 min-w-0 overflow-hidden">
              <div className="font-mono text-xl md:text-2xl font-bold tracking-tight">
                <span className="text-white">{formatTime(currentTime)}</span>
                <span className="text-zinc-600 mx-1 md:mx-2">/</span>
                <span className="text-zinc-500">{formatTime(duration)}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] md:text-xs font-medium text-blue-400 tracking-wider uppercase truncate">
                <span>{isPlaying ? "Playing" : "Paused"}</span>
                <span className="text-zinc-600">•</span>
                <span className="truncate">{currentVersionName || "No version selected"}</span>
              </div>
            </div>
          </div>

          {/* ✅ 修改：音量控制區塊整個隱藏 (hidden md:flex) */}
          <div className="hidden md:flex items-center gap-3 bg-zinc-900/80 px-4 py-2 rounded-xl border border-zinc-800 shadow-inner group/volume relative">
            <button 
              onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
              className="text-zinc-400 hover:text-blue-400 transition-colors shrink-0"
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            
            <div className="w-24 lg:w-28 relative">
               <div className={cn(
                 "absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded transition-all duration-300 pointer-events-none",
                 showPercent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
               )}>
                 {Math.round(volume * 100)}%
               </div>

               <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                onValueCommit={handleVolumeCommit}
                className={cn(
                  "cursor-pointer",
                  "[&>[data-orientation=horizontal]]:bg-zinc-800",
                  "[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-zinc-700 [&_[role=slider]]:bg-white",
                  "[&_.relative_.bg-primary]:bg-blue-600 group-hover/volume:[&_.relative_.bg-primary]:bg-blue-500"
                )}
              />
            </div>
          </div>
        </div>

        {/* Waveform Area (手機高度縮小) */}
        <div className="relative h-16 md:h-24 bg-zinc-950 rounded-lg border border-zinc-800/50 group mt-4 select-none">
          <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none px-2">
            <div className="flex items-end gap-[1px] md:gap-[2px] h-1/2 w-full">
              {Array.from({ length: 60 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 rounded-full ${((i/60) * duration < currentTime) ? 'bg-blue-500' : 'bg-zinc-700'}`} 
                  style={{ height: `${(20 + Math.abs(Math.sin(i * 123)) * 80).toFixed(2)}%` }}
                />
              ))}
            </div>
          </div>

          {/* 留言標記 */}
          <div className="absolute inset-0 px-2 pointer-events-none">
            <div className="relative w-full h-full">
              {comments.map((comment) => {
                const position = (comment.timestamp / duration) * 100;
                return (
                  <div key={comment.id} className="absolute top-0 bottom-0 w-[1px] md:w-[2px] bg-blue-500/20" style={{ left: `${position}%` }}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={(e) => { e.stopPropagation(); onSeek(comment.timestamp); }} className="absolute top-1 md:top-2 -translate-x-1/2 p-0.5 md:p-1 bg-blue-600 text-white rounded-full pointer-events-auto hover:scale-125 transition-transform">
                          <MessageCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-zinc-800 text-white text-[10px]"><p>{comment.content}</p></TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
          
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onValueChange={(val) => onSeek(val[0])}
          />
          <div className="absolute top-0 bottom-0 w-[1px] bg-white z-20 pointer-events-none" style={{ left: `${(currentTime / duration) * 100}%` }} />
        </div>
      </div>
    </TooltipProvider>
  );
}