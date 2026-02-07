"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
//import { redirect } from "next/navigation";

export async function deleteAccount() {
  // 1. 先確認當前使用者是誰 (安全性檢查)
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  // 2. 建立 Admin Client (擁有刪除權限)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, 
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 3. 執行刪除 (這會連動刪除 auth.users)
  // ⚠️ 前提：你的 public.profiles, project_members 等表格
  // 必須設定 Foreign Key 的 "ON DELETE CASCADE"，資料才會一起清乾淨。
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
    user.id
  );

  if (deleteError) {
    console.error("Delete account error:", deleteError);
    throw new Error("Failed to delete account");
  }

  // 4. 登出並導向
  await supabase.auth.signOut();
  //redirect("/login");
}