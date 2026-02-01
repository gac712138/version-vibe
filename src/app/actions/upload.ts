"use server";

import { r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// 1. 產生上傳用的簽章網址 (Presigned URL)
export async function getUploadUrl(
  filename: string,
  fileType: string,
  projectId: string,
  trackId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 建立唯一的檔案路徑: projects/{pid}/tracks/{tid}/{timestamp}-{filename}
  const fileKey = `projects/${projectId}/tracks/${trackId}/${Date.now()}-${filename}`;

  // 向 R2 申請一個 "PUT" 權限的臨時網址 (有效期 60秒)
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
  });

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 60 });

  return { signedUrl, fileKey };
}

// 2. 上傳成功後，把資料寫入 Supabase
// 修改點：新增 fileType 參數
export async function createAssetRecord(
  projectId: string,
  trackId: string,
  fileName: string,
  fileKey: string,
  fileSize: number,
  fileType: string 
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 找出目前版本號，自動 +1
  const { count } = await supabase
    .from("audio_assets")
    .select("*", { count: "exact", head: true })
    .eq("track_id", trackId);
  
  const nextVersion = (count || 0) + 1;

  // 寫入資料庫
  const { error } = await supabase.from("audio_assets").insert({
    project_id: projectId,
    track_id: trackId,
    uploader_id: user.id,
    name: fileName,
    version_number: nextVersion,
    storage_path: fileKey,
    file_size: fileSize,
    content_type: fileType, // 這裡現在會使用傳入的參數，不再寫死
  });

  if (error) {
    console.error("DB Insert Error:", error);
    throw new Error("Failed to save record");
  }

  revalidatePath(`/project/${projectId}/track/${trackId}`);
}