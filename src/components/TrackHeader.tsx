"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { UploadVersionBtn } from "@/components/UploadVersionBtn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateTrackName, deleteTrack } from "@/app/actions/core"; 
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { ProjectRole } from "@/utils/supabase/role"; // 確保路徑與你 ProjectHeader 一致

interface TrackHeaderProps {
  track: {
    id: string;
    name: string;
    project_id: string;
    projects: { name: string } | null;
  };
  currentUserRole: ProjectRole;
}

export function TrackHeader({ track, currentUserRole }: TrackHeaderProps) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState(track.name);
  const router = useRouter();

  // ✅ 權限判斷：Owner 或 Admin 可以編輯 Track (Viewer 不行)
  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await updateTrackName(track.id, track.project_id, newName);
      toast.success("Track 名稱已更新");
      setIsRenameOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("更新失敗");
    }
  };

  const handleDelete = async () => {
    if (!confirm("確定要刪除這個 Track 嗎？這將刪除所有相關的版本與留言，無法復原。")) return;
    try {
      await deleteTrack(track.id, track.project_id);
      toast.success("Track 已刪除");
    } catch (error) {
      console.error(error);
      toast.error("刪除失敗");
    }
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/project/${track.project_id}`}>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          <div className="flex flex-col">
            <div className="text-xs text-zinc-500 mb-0.5">
              <span>{track.projects?.name}</span>
            </div>
            
            <div className="flex items-center gap-2 group">
              <h1 className="text-lg font-bold text-white">{track.name}</h1>
              
              {/* ✅ 只有 Owner 或 Admin 看得到這個選單 */}
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                    <DropdownMenuItem onClick={() => setIsRenameOpen(true)} className="cursor-pointer focus:bg-zinc-800 focus:text-white">
                      <Edit className="mr-2 h-4 w-4" /> 重新命名
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-red-400 focus:bg-red-900/20 focus:text-red-400">
                      <Trash2 className="mr-2 h-4 w-4" /> 刪除 Track
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Upload 按鈕權限邏輯：Owner/Admin 才能上傳 */}
        {canEdit && (
          <div className="flex items-center gap-2">
            <UploadVersionBtn projectId={track.project_id} trackId={track.id} />
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle>重新命名 Track</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white focus:ring-blue-600" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" className="text-zinc-400 hover:text-white">取消</Button></DialogClose>
            <Button onClick={handleRename} className="bg-blue-600 hover:bg-blue-500">儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}