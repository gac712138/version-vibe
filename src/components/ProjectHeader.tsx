"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreHorizontal, Edit, Trash2, FolderKanban, Loader2 } from "lucide-react";
import Link from "next/link";
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
import { updateProjectName, deleteProject } from "@/app/actions/core"; 
import { toast } from "sonner";
import { useRouter } from "next/navigation";
// ✅ 確保路徑與實體檔案一致
import type { ProjectRole } from "@/utils/supabase/role";

interface ProjectHeaderProps {
  project: {
    id: string;
    name: string;
  };
  currentUserRole: ProjectRole | string | null; 
}

export function ProjectHeader({ project, currentUserRole }: ProjectHeaderProps) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // ✅ 權限判斷：只有真正的 Owner 可以更名或刪除
  const isOwner = currentUserRole === 'owner';

  const handleRename = async () => {
    if (!newName.trim() || newName === project.name) {
      setIsRenameOpen(false);
      return;
    }
    
    setIsLoading(true);
    try {
      await updateProjectName(project.id, newName);
      toast.success("專案名稱已更新");
      setIsRenameOpen(false);
      router.refresh();
    } catch (error: any) { 
      toast.error("更新失敗：" + error.message); 
    } finally {
      setIsLoading(false);
    }
  };

const handleDelete = async () => {
    if (!confirm("警告：這將刪除整個專案及其所有 Tracks，動作無法復原！")) return;
    
    setIsLoading(true);
    try {
      await deleteProject(project.id);
      toast.success("專案已刪除");
      // 注意：如果 deleteProject 裡面已經有 redirect，這裡的 router.push 可以拿掉
      // 但為了保險，通常我們會留著 router.push，以防 server action 沒跳轉
    } catch (error: any) { 
      // ✅ 關鍵修正：忽略 NEXT_REDIRECT 錯誤
      if (error.message === 'NEXT_REDIRECT') {
        return; 
      }
      console.error(error);
      toast.error("刪除失敗：" + error.message); 
      setIsLoading(false);
    }
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 group">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FolderKanban className="w-5 h-5 text-blue-500" />
            </div>
            <h1 className="text-xl font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {project.name}
            </h1>
            
            {/* ✅ 只有 Owner 具備管理權限 */}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-5 w-5" />
                   </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                  <DropdownMenuItem onClick={() => setIsRenameOpen(true)} className="cursor-pointer focus:bg-zinc-800 focus:text-white">
                    <Edit className="mr-2 h-4 w-4" /> 重新命名專案
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-red-400 focus:bg-red-900/20 focus:text-red-400">
                    <Trash2 className="mr-2 h-4 w-4" /> 刪除專案
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

       {/* Rename Dialog */}
       <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle>重新命名專案</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleRename()}
              className="bg-zinc-800 border-zinc-700 text-white focus:ring-blue-600" 
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" className="text-zinc-400 hover:text-white" disabled={isLoading}>取消</Button></DialogClose>
            <Button onClick={handleRename} className="bg-blue-600 hover:bg-blue-500 min-w-[80px]" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}