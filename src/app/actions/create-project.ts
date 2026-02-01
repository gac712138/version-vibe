"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  
  // 1. 獲取當前使用者
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name) {
    throw new Error("Project name is required");
  }

  // 2. 寫入專案 (關鍵修正：必須帶上 owner_id)
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name,
      description,
      owner_id: user.id, // 👈 這裡一定要有，不然會被 RLS 擋下！
    })
    .select()
    .single();

  if (error) {
    console.error("Create Project Error:", error);
    throw new Error("Failed to create project");
  }

  // 3. (選用) 將自己加入成員表 - 雖然我們是 Owner，但明確加入成員表通常比較好管理
  // 如果你的 RLS 依賴 project_members 來判斷權限，這步就很重要
  const { error: memberError } = await supabase
    .from("project_members")
    .insert({
      project_id: project.id,
      user_id: user.id,
      role: "owner",
      joined_at: new Date().toISOString(),
    });

  if (memberError) {
    console.error("Add Member Error:", memberError);
    // 這裡不一定要 throw，因為專案已經建立了，頂多是權限顯示問題
  }

  // 4. 重整路徑並跳轉
  revalidatePath("/dashboard");
  redirect(`/project/${project.id}`);
}