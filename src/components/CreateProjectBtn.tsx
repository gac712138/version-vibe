"use client";

import { useState, useRef, useCallback } from "react";
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
import { Plus, Loader2, Camera } from "lucide-react";
import { createProject } from "@/app/actions/create-project";
import { toast } from "sonner";
import { ImageCropper } from "@/components/ImageCropper";
import { getCroppedImg } from "@/lib/canvasUtils";
import { cn } from "@/lib/utils";

export function CreateProjectBtn() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ✅ 改用 onSubmit 手動處理，確保 isLoading 鎖定更及時
  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return; 

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    
    if (!name.trim()) {
      toast.error("請輸入專案名稱");
      return;
    }

    setIsLoading(true); // 1. 立即鎖定按鈕與介面
    
    try {
      // 2. 塞入裁切後的圖片
      if (croppedBlob) {
        formData.set("cover", croppedBlob, "project-cover.jpg");
      }

      // 3. 等待後端完成回傳 OK
      await createProject(formData);
      
      // 4. 成功後才關閉與重置
      setOpen(false);
      resetForm();
      toast.success("專案建立成功");
    } catch (error: any) {
      // 處理 Next.js Redirect
      if (error.message === 'NEXT_REDIRECT') {
        setOpen(false);
        resetForm();
        return; 
      }
      toast.error("建立失敗：" + error.message);
      setIsLoading(false); // 失敗時解除鎖定
    }
  };

  const resetForm = () => {
    setPreviewUrl(null);
    setCroppedBlob(null);
    setSelectedFile(null);
    setIsLoading(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !isLoading && setOpen(val)}>
        <DialogTrigger asChild>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-900/20 px-6 font-bold">
            <Plus className="h-4 w-4" /> 新增專案
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-zinc-800 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">建立新專案</DialogTitle>
            <DialogDescription className="text-zinc-400">
              設定專案名稱並上傳封面圖。
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleManualSubmit} className="space-y-6 pt-4">
            <div className="flex flex-col items-center gap-4">
              <div 
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={cn(
                  "relative w-40 h-40 rounded-xl overflow-hidden border-2 border-dashed border-zinc-800 bg-zinc-900 hover:border-blue-600 transition-all cursor-pointer group",
                  isLoading && "opacity-50 pointer-events-none cursor-not-allowed"
                )}
              >
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                    <Camera className="w-10 h-10 opacity-50" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-center px-4">上傳封面</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-xs font-bold text-white uppercase tracking-tighter">更換圖片</span>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <p className="text-[10px] text-zinc-500 italic opacity-80">* 檔案不得超過 10MB</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">專案名稱</Label>
              <Input
                id="name"
                name="name"
                placeholder="例如：Tiger Island - EP"
                className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-blue-600 h-11"
                required
                disabled={isLoading}
              />
            </div>

            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isLoading} 
                className={cn(
                  "w-full bg-blue-600 hover:bg-blue-500 font-bold h-12 shadow-lg shadow-blue-900/20 transition-all active:scale-95",
                  isLoading && "opacity-70 pointer-events-none cursor-wait"
                )}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>專案建立中...</span>
                  </div>
                ) : (
                  "確認並建立專案"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCropperOpen} onOpenChange={(val) => !isLoading && setIsCropperOpen(val)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>調整封面比例</DialogTitle></DialogHeader>
          <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden border border-zinc-800">
            {selectedFile && <ImageCropper imageSrc={selectedFile} onCropComplete={onCropComplete} />}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsCropperOpen(false)} className="text-zinc-400" disabled={isLoading}>取消</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-500 px-8 font-bold" 
              onClick={handleConfirmCrop}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              套用裁切
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}