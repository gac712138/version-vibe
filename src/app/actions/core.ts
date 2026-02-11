"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ✅ 內部工具：確保 Profile 擁有 Google 的頭像與名稱
async function syncProfileIfNeeded(supabase: any, user: any) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url, display")
    .eq("id", user.id)
    .single();

  const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const googleName = user.user_metadata?.full_name;

  // 如果資料庫裡沒圖片，但 Google 有，就補上去
  if (profile && (!profile.avatar_url || !profile.display)) {
    await supabase.from("profiles").update({
      avatar_url: profile.avatar_url || googleAvatar,
      display: profile.display || googleName
    }).eq("id", user.id);
  }
}

export async function updateProjectName(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // ✅ 每次更新專案時，順便檢查並同步頭像
  if (user) await syncProfileIfNeeded(supabase, user);

  const name = formData.get("name") as string;
  const coverFile = formData.get("cover") as File | null;

  if (!name) throw new Error("專案名稱不能為空");

  const { error: updateError } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", projectId);

  if (updateError) throw new Error(updateError.message);

  if (coverFile && coverFile.size > 0) {
    const filePath = `${projectId}/cover-${Date.now()}.jpg`;
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
      
      await supabase
        .from("projects")
        .update({ cover_url: publicUrl })
        .eq("id", projectId);
    }
  }

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