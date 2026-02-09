"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ✅ 修改為接收 FormData 以支援圖片上傳
export async function updateProjectName(projectId: string, formData: FormData) {
  const supabase = await createClient();
  
  // 1. 提取名稱與檔案
  const name = formData.get("name") as string;
  const coverFile = formData.get("cover") as File | null;

  if (!name) throw new Error("專案名稱不能為空");

  // 2. 更新專案基礎名稱
  const { error: updateError } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", projectId);

  if (updateError) throw new Error(updateError.message);

  // 3. 處理圖片更新邏輯
  if (coverFile && coverFile.size > 0) {
    const filePath = `${projectId}/cover-${Date.now()}.jpg`;

    // 上傳至您建立的 project-covers 儲存桶
    const { error: uploadError } = await supabase.storage
      .from("project-covers")
      .upload(filePath, coverFile, {
        upsert: true,
        contentType: coverFile.type,
      });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from("project-covers")
        .getPublicUrl(filePath);
      
      // 更新資料庫中的 cover_url 欄位
      await supabase
        .from("projects")
        .update({ cover_url: publicUrl })
        .eq("id", projectId);
    } else {
      console.error("Update Cover Error:", uploadError);
      // 圖片失敗通常不拋出錯誤，讓名稱更新維持成功
    }
  }

  // 重新整理相關頁面快取
  revalidatePath("/dashboard");
  revalidatePath(`/project/${projectId}`);
  
  return { success: true };
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard"); // 確保刪除後列表同步
  redirect("/dashboard");
}

export async function updateTrackName(trackId: string, projectId: string, newName: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tracks")
    .update({ name: newName })
    .eq("id", trackId);

  if (error) throw new Error(error.message);
  revalidatePath(`/project/${projectId}/track/${trackId}`);
}

export async function deleteTrack(trackId: string, projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tracks")
    .delete()
    .eq("id", trackId);

  if (error) throw new Error(error.message);
  revalidatePath(`/project/${projectId}`); // 確保回專案頁時清單同步
  redirect(`/project/${projectId}`);
}