"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const coverFile = formData.get("cover") as File | null;

  if (!name) throw new Error("Project name is required");

  // 1. 建立專案基礎資料
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name,
      owner_id: user.id,
      status: 'active'
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 2. ✅ 先將自己加入成員 (Owner)
  // 這樣做是為了確保後續更新專案 (Update) 時，若有 RLS 檢查成員身份，能順利通過。
  const { error: memberError } = await supabase
    .from("project_members")
    .insert({
      project_id: project.id,
      user_id: user.id,
      role: "owner"
    });

  if (memberError) console.error("Failed to add owner member:", memberError);

  // 3. ✅ 處理封面圖片上傳與資料庫更新
  if (coverFile && coverFile.size > 0) {
    const filePath = `${project.id}/cover-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("project-covers")
      .upload(filePath, coverFile, {
        upsert: true,
        contentType: 'image/jpeg'
      });

    if (!uploadError) {
      // 獲取公開網址
      const { data: { publicUrl } } = supabase.storage
        .from("project-covers")
        .getPublicUrl(filePath);
      
      // ✅ 更新專案的 cover_url 欄位
      const { error: updateError } = await supabase
        .from("projects")
        .update({ cover_url: publicUrl })
        .eq("id", project.id);
      
      if (updateError) console.error("❌ 更新資料庫 cover_url 失敗:", updateError);
    } else {
      // 如果這裡報錯，請檢查步驟 1 的 SQL 是否執行成功
      console.error("❌ 圖片上傳至 Storage 失敗 (RLS 限制):", uploadError);
    }
  }

  revalidatePath("/dashboard");
  redirect(`/project/${project.id}`);
}