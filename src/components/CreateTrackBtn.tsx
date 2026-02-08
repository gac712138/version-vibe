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

// 接收 projectId 作為參數，因為新增歌曲必須知道是哪張專輯
export function CreateTrackBtn({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      await createTrack(formData);
      setOpen(false); // 成功後關閉視窗
    } catch (error) {
      console.error(error);
      alert("建立失敗");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 gap-2 text-white">
          <Plus className="h-4 w-4" />
          新增
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新增歌曲</DialogTitle>
        </DialogHeader>
        
        <form action={handleSubmit} className="grid gap-4 py-4">
          {/* 隱藏欄位：傳送 Project ID */}
          <input type="hidden" name="projectId" value={projectId} />
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-zinc-400">
              曲名
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. 01. Intro"
              className="col-span-3 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-blue-500"
              required
              autoComplete="off"
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              新增
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}