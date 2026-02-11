"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { createTrack } from "@/app/actions/create-track";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CreateTrackBtn({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ 改用 onSubmit 手動處理，確保 isLoading 鎖定更及時
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    if (!name.trim()) {
      toast.error("請輸入歌曲名稱");
      return;
    }

    setIsLoading(true); // 1. 立即鎖定 UI
    
    try {
      // 2. 等待後端完成
      await createTrack(formData);
      
      // 3. 成功後關閉視窗並重置
      setOpen(false);
      toast.success("歌曲已新增");
    } catch (error: any) {
      // 處理重定向錯誤
      if (error.message === 'NEXT_REDIRECT') {
        setOpen(false);
        return; 
      }
      toast.error("建立失敗：" + error.message);
      setIsLoading(false); // 失敗才解除鎖定
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !isLoading && setOpen(val)}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 gap-2 text-white font-bold px-6 shadow-lg shadow-blue-900/20 transition-all active:scale-95">
          <Plus className="h-4 w-4" />
          新增歌曲
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[400px] rounded-[32px] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">新增歌曲</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          {/* 隱藏欄位：傳送 Project ID */}
          <input type="hidden" name="projectId" value={projectId} />
          
          <div className="flex flex-col gap-3">
            <Label htmlFor="name" className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest ml-1">
              歌曲名稱
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="例如：01. 虎小島序曲"
              className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-blue-600 h-12 rounded-xl px-4"
              required
              disabled={isLoading}
              autoComplete="off"
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isLoading}
              className={cn(
                "w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 shadow-lg shadow-blue-900/20 transition-all",
                // ✅ 強制 CSS 禁用效果
                isLoading && "opacity-70 pointer-events-none cursor-wait"
              )}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>歌曲建立中...</span>
                </div>
              ) : (
                "確認新增"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}