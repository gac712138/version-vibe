"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  
  // 1. 驗證使用者是否登入
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  if (!name) {
    throw new Error("Project name is required");
  }

  // 2. 寫入資料庫 (Project)
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name,
      owner_id: user.id,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    console.error("Create Project Error:", error);
    throw new Error("Failed to create project");
  }

  // 3. 將自己加入成員表 (Project Members) - 確保權限與查詢一致性
  const { error: memberError } = await supabase
    .from("project_members")
    .insert({
      project_id: project.id,
      user_id: user.id,
      role: 'owner',
      display_name: user.user_metadata.full_name || 'Owner'
    });

  if (memberError) {
    console.error("Add Member Error:", memberError);
  }

  // 4. 重整快取並跳轉到新專案頁面
  revalidatePath("/dashboard");
  redirect(`/project/${project.id}`);
}