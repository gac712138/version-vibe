"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// ✅ 1. 更新型別定義：加入 avatar_url (設為選填 optional)
export async function updateMemberProfile(
  memberId: string, 
  data: { display_name: string; avatar_url?: string }
) {
  const supabase = await createClient();

  // 準備要寫入的資料物件
  const updatePayload: any = {
    display_name: data.display_name,
  };

  // 如果前端有傳 avatar_url，才寫入 (避免覆蓋成 null)
  if (data.avatar_url) {
    updatePayload.avatar_url = data.avatar_url;
  }

  const { data: member, error } = await supabase
    .from("project_members")
    .update(updatePayload)
    .eq("id", memberId)
    .select("project_id")
    .single();

  if (error) {
    console.error("Update Profile Error:", error);
    throw new Error("Failed to update profile");
  }

  if (member) {
    revalidatePath(`/project/${member.project_id}`);
  }
}

// ✅ 2. 保留這個備用函式 (給其他地方用)
export async function updateMemberNickname(projectId: string, nickname: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("project_members")
    .update({ display_name: nickname } as any)
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath(`/project/${projectId}`);
}