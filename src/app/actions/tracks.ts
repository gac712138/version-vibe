"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function deleteTrack(projectId: string, trackId: string) {
  const supabase = await createClient();

  // 1. 找出該 Track 下所有 Asset 的 R2 路徑
  const { data: assets } = await supabase
    .from("audio_assets")
    .select("storage_path")
    .eq("track_id", trackId);

  // 2. 批量刪除 R2 實體檔案
  if (assets && assets.length > 0) {
    try {
      const deleteParams = {
        Bucket: process.env.R2_BUCKET_NAME,
        Delete: {
          Objects: assets.map((a) => ({ Key: a.storage_path })),
        },
      };
      await s3.send(new DeleteObjectsCommand(deleteParams));
    } catch (e) {
      console.error("R2 清理失敗", e);
    }
  }

  // 3. 刪除資料庫紀錄 (外鍵級聯會自動刪除相關 asset 紀錄)
  const { error } = await supabase.from("tracks").delete().eq("id", trackId);
  if (error) throw error;

  revalidatePath(`/project/${projectId}`);
}