"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  
  // 獲取目前登入的使用者資訊
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // ✅ 步驟 0：先從 profiles 表抓取該使用者的顯示名稱
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

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

  // 2. ✅ 建立成員資訊，同步寫入 display_name
  const { error: memberError } = await supabase
    .from("project_members")
    .insert({
      project_id: project.id,
      user_id: user.id,
      role: "owner",
      // 直接填入 Profile 的顯示名稱，若無則回退至 User ID 或自定義預設值
      display_name: profile?.display_name || "新成員" 
    });

  if (memberError) {
    console.error("❌ 無法將 Owner 加入成員清單:", memberError);
    // 注意：若此處失敗，後續 RLS 可能會導致圖片上傳失敗
  }

  // 3. 處理封面圖片上傳與資料庫更新
  if (coverFile && coverFile.size > 0) {
    const filePath = `${project.id}/cover-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("project-covers")
      .upload(filePath, coverFile, {
        upsert: true,
        contentType: 'image/jpeg'
      });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from("project-covers")
        .getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from("projects")
        .update({ cover_url: publicUrl })
        .eq("id", project.id);
      
      if (updateError) console.error("❌ 更新封面網址失敗:", updateError);
    } else {
      console.error("❌ 圖片上傳至 Storage 失敗:", uploadError);
    }
  }

  revalidatePath("/dashboard");
  redirect(`/project/${project.id}`);
}