"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { createProject } from "@/app/actions/create-project";
import { toast } from "sonner";

export function CreateProjectBtn() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 綁定 Form 的提交事件
async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      await createProject(formData);
      setOpen(false); // 關閉視窗
      // 成功後會自動 redirect，所以這裡不需要 toast 也可以，或者寫 toast.success
    } catch (error: any) {
      // ✅ 關鍵修正：忽略 NEXT_REDIRECT 錯誤
      if (error.message === 'NEXT_REDIRECT') {
        setOpen(false); // 雖然是 redirect，但代表成功，所以也要關視窗
        return; 
      }
      
      console.error(error);
      toast.error("建立失敗：" + error.message);
      // 只有真的失敗時才把 loading 關掉，讓使用者重試
      setIsLoading(false); 
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription className="text-zinc-400">
            建立一個新的混音交付專案。
          </DialogDescription>
        </DialogHeader>
        
        <form action={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-zinc-300">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Tiger Island EP"
                className="col-span-3 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-blue-500"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}