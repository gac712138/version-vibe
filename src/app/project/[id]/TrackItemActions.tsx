"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TrackItemActionsProps {
  track: { id: string; name: string };
  canEdit: boolean;
}

export function TrackItemActions({ track, canEdit }: TrackItemActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(track.name);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  if (!canEdit) return null;

  // 1. 更新名稱
  const handleUpdate = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === track.name) {
      setIsEditOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("tracks")
        .update({ name: trimmedName })
        .eq("id", track.id);

      if (error) throw error;
      
      toast.success("音軌名稱已更新");
      setIsEditOpen(false);
      router.refresh(); 
    } catch (error: any) {
      toast.error("更新失敗：" + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 刪除音軌
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("tracks")
        .delete()
        .eq("id", track.id);

      if (error) throw error;
      
      toast.success("音軌已刪除");
      setIsDeleteOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error("刪除失敗：" + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-zinc-800 text-zinc-400">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white w-40">
          <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="gap-2 cursor-pointer">
            <Pencil className="w-4 h-4" /> 編輯名稱
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setIsDeleteOpen(true)} 
            className="gap-2 cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-400/10"
          >
            <Trash2 className="w-4 h-4" /> 刪除音軌
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 編輯 Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle>重新命名音軌</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-zinc-400">音軌名稱</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleUpdate()}
                className="bg-zinc-800 border-zinc-700 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={isLoading || !newName.trim()} className="bg-blue-600 hover:bg-blue-500 min-w-[80px]">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除 AlertDialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除音軌嗎？</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              這將永久刪除「{track.name}」及其關聯的所有音訊版本。此動作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700">取消</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} className="bg-red-600 hover:bg-red-500">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "確認刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}