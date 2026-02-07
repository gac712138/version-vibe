"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  // ❌ 移除 description，因為資料庫沒有這個欄位，會導致後面程式碼跑不到
  // const description = formData.get("description") as string; 

  if (!name) {
    throw new Error("Project name is required");
  }

  // 1. 建立專案
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name,
      // description, // 註解掉
      owner_id: user.id,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    console.error("Create Project Error:", error);
    throw new Error(error.message);
  }

  // 2. ✅ 建立成功後，馬上將自己加入成員 (Owner)
  const { error: memberError } = await supabase
    .from("project_members")
    .insert({
      project_id: project.id,
      user_id: user.id,
      role: "owner"
      // 不設定 display_name，讓使用者進去後觸發 Onboarding 設定暱稱
    });

  if (memberError) {
    console.error("Failed to add owner member:", memberError);
    // 這裡雖然報錯，但專案已建立，通常不會 throw，以免死在 redirect 前
  }

  revalidatePath("/dashboard");
  redirect(`/project/${project.id}`);
}