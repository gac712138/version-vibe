"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * 更新當前使用者在特定專案中的暱稱
 * 適用於 OnboardingGuide 或個人設定介面
 */
export async function updateMemberNickname(projectId: string, nickname: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("尚未登入");

  const trimmedName = nickname.trim();
  if (!trimmedName) throw new Error("暱稱不能為空");

  // ✅ 核心修正：明確指定更新條件，確保 RLS 政策能正確對應
  const { error } = await supabase
    .from("project_members")
    .update({ 
      display_name: trimmedName 
    })
    .eq("project_id", projectId)
    .eq("user_id", user.id); // 💡 確保只修改目前登入者的紀錄

  if (error) {
    console.error("Update Nickname Error:", error);
    throw new Error("無法更新暱稱，請檢查資料庫權限設定");
  }

  // 重新整理專案頁面資料
  revalidatePath(`/project/${projectId}`);
}

/**
 * 更新指定成員資料 (保留備用，通常用於管理員)
 */
export async function updateMemberProfile(
  memberId: string, 
  data: { display_name: string; avatar_url?: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const updatePayload: any = {
    display_name: data.display_name.trim(),
  };

  if (data.avatar_url) {
    updatePayload.avatar_url = data.avatar_url;
  }

  const { data: member, error } = await supabase
    .from("project_members")
    .update(updatePayload)
    .eq("id", memberId)
    .eq("user_id", user.id) // 💡 安全檢查：確保只能修改自己的資料
    .select("project_id")
    .single();

  if (error) throw new Error("Failed to update profile");
  if (member) revalidatePath(`/project/${member.project_id}`);
}