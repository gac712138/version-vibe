"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreHorizontal, Edit, Trash2, FolderKanban, Loader2, Camera } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProjectName, deleteProject } from "@/app/actions/core"; 
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { ProjectRole } from "@/utils/supabase/role";
import { ImageCropper } from "../../shared/components/ImageCropper";
import { getCroppedImg } from "@/lib/canvasUtils"; // 複用工具

interface ProjectHeaderProps {
  project: {
    id: string;
    name: string;
    cover_url?: string | null;
  };
  currentUserRole: ProjectRole | string | null; 
}

export function ProjectHeader({ project, currentUserRole }: ProjectHeaderProps) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // --- 裁切相關狀態 (完全複用 CreateProjectBtn 邏輯) ---
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(project.cover_url || null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOwner = currentUserRole === 'owner'; // ✅ 保留 Owner 權限邏輯

  // 1. 處理檔案選取
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("檔案不得超過 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFile(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = ""; 
    }
  };

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // 2. 執行裁切
  const handleConfirmCrop = async () => {
    if (!selectedFile || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(selectedFile, croppedAreaPixels);
      if (croppedImage) {
        setPreviewUrl(croppedImage);
        const response = await fetch(croppedImage);
        const blob = await response.blob();
        setCroppedBlob(blob);
        setIsCropperOpen(false);
        toast.success("封面裁切完成");
      }
    } catch (e) {
      toast.error("裁切失敗");
    }
  };

  // 3. 提交更新資料
  async function handleSubmit(formData: FormData) {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (croppedBlob) {
        formData.set("cover", croppedBlob, "project-cover.jpg");
      }

      await updateProjectName(project.id, formData);
      setIsRenameOpen(false);
      toast.success("專案已更新");
      router.refresh();
    } catch (error: any) {
      toast.error("更新失敗：" + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!confirm("警告：這將刪除整個專案，動作無法復原！")) return;
    setIsLoading(true);
    try {
      await deleteProject(project.id);
      toast.success("專案已刪除");
    } catch (error: any) { 
      if (error.message === 'NEXT_REDIRECT') return; 
      toast.error("刪除失敗");
      setIsLoading(false);
    }
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-white hover:bg-zinc-700 transition-all">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 group">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <FolderKanban className="w-5 h-5 text-blue-500" />
            </div>
            <h1 className="text-xl font-bold text-white truncate max-w-[200px] sm:max-w-md">{project.name}</h1>
            
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-xl transition-all", "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50", "hover:bg-zinc-700 hover:text-white")}>
                      <MoreHorizontal className="h-5 w-5" />
                   </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                  <DropdownMenuItem onClick={() => setIsRenameOpen(true)} className="cursor-pointer focus:bg-zinc-800 focus:text-white">
                    <Edit className="mr-2 h-4 w-4" /> 編輯專案資訊
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

       {/* 編輯專案視窗 (完全共用 CreateProject 樣式) */}
       <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-zinc-800 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">編輯專案</DialogTitle>
            <DialogDescription className="text-zinc-400">修改專案名稱或更換封面照片。</DialogDescription>
          </DialogHeader>
          
          <form action={handleSubmit} className="space-y-6 pt-4">
            <div className="flex flex-col items-center gap-4">
              <div 
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className="relative w-40 h-40 rounded-xl overflow-hidden border-2 border-dashed border-zinc-800 bg-zinc-900 hover:border-blue-600 transition-all cursor-pointer group"
              >
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                    <Camera className="w-8 h-8 opacity-50" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-center px-4">上傳封面</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-xs font-bold text-white uppercase tracking-tighter">更換圖片</span>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <p className="text-[10px] text-zinc-500 italic">* 檔案不得超過 10MB</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">專案名稱</Label>
              <Input
                id="name"
                name="name"
                defaultValue={project.name}
                className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-blue-600 h-11"
                required
                disabled={isLoading}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 font-bold h-12 shadow-lg shadow-blue-900/20">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "儲存變更"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 獨立裁切視窗 (完全共用) */}
      <Dialog open={isCropperOpen} onOpenChange={setIsCropperOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>調整封面比例</DialogTitle></DialogHeader>
          <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden border border-zinc-800">
            {selectedFile && <ImageCropper imageSrc={selectedFile} onCropComplete={onCropComplete} />}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsCropperOpen(false)} className="text-zinc-400">取消</Button>
            <Button className="bg-blue-600 hover:bg-blue-500 px-8" onClick={handleConfirmCrop}>套用裁切</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}