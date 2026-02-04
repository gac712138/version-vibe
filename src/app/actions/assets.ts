"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// 1. 初始化 S3 Client (用於刪除 R2 檔案)
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * 更新 Asset 名稱
 */
export async function updateAssetName(projectId: string, assetId: string, newName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("audio_assets")
    .update({ name: newName })
    .eq("id", assetId);

  if (error) throw error;

  revalidatePath(`/project/${projectId}`);
}

/**
 * 刪除 Asset (同時刪除 R2 檔案 與 資料庫紀錄)
 */
export async function deleteAsset(projectId: string, assetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  console.log("🗑️ 準備刪除 Asset ID:", assetId);

  // --- 步驟 A: 先去資料庫查詢檔案路徑 (因為刪除後就查不到了) ---
  const { data: asset, error: fetchError } = await supabase
    .from("audio_assets")
    .select("storage_path")
    .eq("id", assetId)
    .single();

  if (fetchError || !asset) {
    console.error("找不到該檔案紀錄，可能已被刪除");
    // 如果資料庫找不到，我們還是嘗試往下執行資料庫刪除動作，確保一致性
  } else {
    // --- 步驟 B: 從 R2 刪除實體檔案 ---
    try {
      console.log("☁️ 正在從 R2 刪除:", asset.storage_path);
      
      const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: asset.storage_path, // 資料庫裡存的路徑 (例如: projects/id/tracks/...)
      });

      await s3.send(command);
      console.log("✅ R2 檔案刪除成功");
    } catch (r2Error) {
      console.error("❌ R2 刪除失敗 (可能是檔案不存在或權限問題):", r2Error);
      // 注意：即使 R2 刪除失敗，我們通常還是會繼續刪除資料庫紀錄，
      // 避免使用者在畫面上看到一個「永遠刪不掉」的檔案。
    }
  }

  // --- 步驟 C: 刪除資料庫紀錄 (Cascade 會自動清掉留言) ---
const { error, count } = await supabase
    .from("audio_assets")
    // ✅ 修正點：將 count: 'exact' 移到 delete() 裡面
    .delete({ count: 'exact' }) 
    .eq("id", assetId)
    // ✅ select() 只需要保留第一個參數 (或是留空代表 '*')
    .select(); 

  if (error) {
    console.error("❌ 資料庫刪除失敗:", error.message);
    throw new Error(error.message);
  }

  // 檢查是否真的刪除了 (因為 RLS 可能擋住)
  if (count === 0) {
     console.warn("⚠️ 刪除筆數為 0，可能是權限不足或檔案已不在");
     // 這裡不拋出 Error，避免前端以為失敗而卡住 UI，因為目標確實「消失」了
  } else {
     console.log("✅ 資料庫紀錄刪除成功");
  }

  revalidatePath(`/project/${projectId}`);
}