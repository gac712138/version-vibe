"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client"; // 僅用於更新名稱
import { deleteTrack } from "@/app/actions/tracks"; // 引入 Server Action
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
  track: { id: string; name: string; project_id: string }; // 確保包含 project_id
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

  // 1. 更新名稱邏輯 (保持不變)
  const handleUpdate = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === track.name) {
      setIsEditOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.from("tracks").update({ name: trimmedName }).eq("id", track.id);
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

  // 2. 刪除音軌：使用 Server Action 連動刪除 R2 檔案
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteTrack(track.project_id, track.id); // 調用清理 R2 的 Action
      toast.success("音軌及其音檔已永久刪除");
      setIsDeleteOpen(false);
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

      {/* 編輯 Dialog 保持原本邏輯 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white shadow-2xl">
          <DialogHeader><DialogTitle>重新命名音軌</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-zinc-400 text-xs uppercase tracking-widest">音軌名稱</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleUpdate()}
                className="bg-zinc-900 border-zinc-800 focus:ring-blue-600 h-12"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-zinc-400 hover:text-white">取消</Button>
            <Button onClick={handleUpdate} disabled={isLoading || !newName.trim()} className="bg-blue-600 hover:bg-blue-500 min-w-[100px]">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "儲存變更"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ 調整為刪除帳號風格的 AlertDialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 font-bold flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              確定要刪除音軌嗎？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 mt-2 leading-relaxed">
              此動作<span className="text-white font-bold mx-1">無法復原</span>。
              <br className="mb-2"/>
              將永久刪除音軌 <span className="text-zinc-200 font-semibold">"{track.name}"</span>，包含其下所有版本音檔及歷史留言都將一併被移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="bg-transparent border-zinc-700 hover:bg-zinc-900 text-zinc-300">
              我再想想
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDelete(); }} 
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white border-0 min-w-[100px] shadow-lg shadow-red-900/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 處理中
                </>
              ) : (
                "確認刪除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}