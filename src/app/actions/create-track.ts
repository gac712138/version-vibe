"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTrack(formData: FormData) {
  const supabase = await createClient();
  
  // 1. 驗證使用者
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const projectId = formData.get("projectId") as string; // 我們會用 hidden input 傳過來

  if (!name || !projectId) {
    throw new Error("Track name and Project ID are required");
  }

  // 2. 寫入 Tracks 表
  // 這裡先簡單處理，sort_order 之後可以做拖拉排序，現在先預設 0
  const { error } = await supabase
    .from("tracks")
    .insert({
      name,
      project_id: projectId,
      sort_order: 0 
    });

  if (error) {
    console.error("Create Track Error:", error);
    throw new Error("Failed to create track");
  }

  // 3. 重整專案頁面
  revalidatePath(`/project/${projectId}`);
  // 注意：這裡不需要 redirect，因為建立完歌曲後，我們通常還是在列表頁繼續建下一首
}