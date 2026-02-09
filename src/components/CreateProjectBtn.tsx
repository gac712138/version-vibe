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
import { Plus, Loader2, Camera, X } from "lucide-react";
import { createProject } from "@/app/actions/create-project";
import { toast } from "sonner";
import { ImageCropper } from "@/components/ImageCropper";
import { getCroppedImg } from "@/lib/canvasUtils";

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
      // ✅ 增加 10MB 檔案大小檢查
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

  async function handleSubmit(formData: FormData) {
    if (isLoading) return; 
    
    setIsLoading(true);
    try {
      if (croppedBlob) {
        formData.set("cover", croppedBlob, "project-cover.jpg");
      }

      await createProject(formData);
      setOpen(false);
      resetForm();
    } catch (error: any) {
      if (error.message === 'NEXT_REDIRECT') {
        setOpen(false);
        resetForm();
        return; 
      }
      toast.error("建立失敗：" + error.message);
      setIsLoading(false); 
    }
  }

  const resetForm = () => {
    setPreviewUrl(null);
    setCroppedBlob(null);
    setSelectedFile(null);
    setIsLoading(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
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
              
              {/* ✅ 補上 10MB 說明文字，與 ProjectHeader 一致 */}
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
                className="w-full bg-blue-600 hover:bg-blue-500 font-bold h-12 shadow-lg shadow-blue-900/20"
              >
                {/* ✅ 按鈕載入狀態與文字 */}
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
    </>
  );
}