"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { getUploadUrl, createAssetRecord } from "@/app/actions/upload";

interface Props {
  projectId: string;
  trackId: string;
}

export function UploadVersionBtn({ projectId, trackId }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. 跟後端要上傳權限 (Presigned URL)
      console.log("Getting signed URL...");
      const { signedUrl, fileKey } = await getUploadUrl(
        file.name,
        file.type,
        projectId,
        trackId
      );

      // 2. 直接上傳到 R2 (不經過 Next.js Server)
      console.log("Uploading to R2...", signedUrl);
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Upload to R2 failed");
      }

      // 3. 上傳成功，通知後端寫入資料庫
      console.log("Saving to DB...");
      await createAssetRecord(projectId, trackId, file.name, fileKey, file.size,file.type);

      alert("Upload successful!");
    } catch (error) {
      console.error(error);
      alert("Upload failed, please try again.");
    } finally {
      setIsUploading(false);
      // 清空 input 讓同一檔案可以再選
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
        accept="audio/*" // 只允許音訊檔
        className="hidden"
      />
      <Button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isUploading}
        className="bg-blue-600 hover:bg-blue-700 gap-2"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload Version
          </>
        )}
      </Button>
    </>
  );
}