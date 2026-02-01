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

export function CreateProjectBtn() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 綁定 Form 的提交事件
  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      await createProject(formData);
      // 注意：成功後 server action 會執行 redirect，所以這裡其實不太需要手動 setOpen(false)
    } catch (error) {
      console.error(error);
      alert("建立失敗，請稍後再試");
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