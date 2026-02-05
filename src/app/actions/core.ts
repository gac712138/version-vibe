"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateProjectName(projectId: string, newName: string) {
  const supabase = await createClient();
  // RLS 會自動檢查權限，我們只要送出請求
  const { error } = await supabase
    .from("projects")
    .update({ name: newName })
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  revalidatePath(`/project/${projectId}`);
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  redirect("/dashboard"); // 或回到首頁
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
  redirect(`/project/${projectId}`);
}