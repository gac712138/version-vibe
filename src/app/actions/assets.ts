"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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
 * 刪除 Asset (及其留言)
 * 注意：這只會刪除資料庫記錄。如果你的 R2 檔案也需要刪除，需要額外串接 S3 DeleteObject。
 */
export async function deleteAsset(projectId: string, assetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. 刪除資料庫記錄 (留言會因為 Cascade 自動消失)
  const { error } = await supabase
    .from("audio_assets")
    .delete()
    .eq("id", assetId);

  if (error) throw error;

  revalidatePath(`/project/${projectId}`);
}