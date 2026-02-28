"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { getUploadUrl, createAssetRecord } from "@/app/actions/upload";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  projectId: string;
  trackId: string;
}

export function UploadVersionBtn({ projectId, trackId }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ 偽裝進度條邏輯：上傳中自動增長
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isUploading) {
      setFakeProgress(0);
      interval = setInterval(() => {
        setFakeProgress((prev) => {
          if (prev >= 92) return prev; // 卡在 92% 等待後端回應
          return prev + Math.random() * 12; // 隨機增量增加真實感
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. 跟後端要上傳權限 (Presigned URL)
      const { signedUrl, fileKey } = await getUploadUrl(
        file.name,
        file.type,
        projectId,
        trackId
      );

      // 2. 直接上傳到 R2 (不經過 Next.js Server)
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) throw new Error("Upload to R2 failed");

      // 3. 上傳成功，通知後端寫入資料庫
      await createAssetRecord(projectId, trackId, file.name, fileKey, file.size, file.type);

      // 4. 完成動畫
      setFakeProgress(100);
      toast.success("上傳成功！");
      
      // 延遲關閉，讓使用者看到 100%
      setTimeout(() => {
        setIsUploading(false);
        window.location.reload(); // 重新整理取得最新版本清單
      }, 600);

    } catch (error) {
      console.error(error);
      toast.error("上傳失敗，請再試一次");
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="audio/*"
        className="hidden"
      />
      
      <Button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isUploading}
        className="bg-blue-600 hover:bg-blue-700 gap-2 text-white h-9"
      >
        <Upload className="h-4 w-4" />
        上傳混音
      </Button>

      {/* ✅ 上傳進度彈窗 */}
      <Dialog open={isUploading} onOpenChange={() => {}}> 
        <DialogContent 
          className="sm:max-w-[400px] bg-zinc-950 border-zinc-800 text-white flex flex-col items-center py-10 shadow-2xl"
          onPointerDownOutside={(e) => e.preventDefault()} // 禁止點擊背景關閉
          onEscapeKeyDown={(e) => e.preventDefault()}      // 禁止按 ESC 關閉
        >
          <DialogHeader className="flex flex-col items-center">
            <div className="relative mb-6">
              {/* 外圈動畫 */}
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 opacity-20" />
              {/* 內圈動畫 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">正在同步版本檔案...</DialogTitle>
          </DialogHeader>
          
          <div className="w-full space-y-5 mt-4 px-4">
            <p className="text-center text-xs text-zinc-400 leading-relaxed">
              音檔正在上傳，這可能需要幾秒鐘的時間
              <br/>
              請不要關閉視窗。
            </p>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>FILE UPLOADING</span>
                <span>{Math.round(fakeProgress)}%</span>
              </div>
              {/* 進度條容器 */}
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                {/* 實際進度條 */}
                <div 
                  className="bg-blue-600 h-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(37,99,235,0.6)]" 
                  style={{ width: `${fakeProgress}%` }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}