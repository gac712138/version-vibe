import { Loader2, Music2 } from "lucide-react";

export function GlobalLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col items-center justify-center bg-black text-white">
      <div className="relative flex items-center justify-center">
        {/* 背景光暈效果 */}
        <div className="absolute h-32 w-32 animate-pulse rounded-full bg-blue-600/20 blur-xl" />
        
        {/* 轉圈圈動畫 */}
        <Loader2 className="relative z-10 h-12 w-12 animate-spin text-blue-500" />
        
        {/* 中心圖示 (可選) */}
        <div className="absolute z-10 flex h-12 w-12 items-center justify-center">
           <Music2 className="h-4 w-4 text-white opacity-50" />
        </div>
      </div>
      
      <p className="mt-4 animate-pulse text-sm font-medium text-zinc-500 tracking-widest uppercase">
        Loading...
      </p>
    </div>
  );
}