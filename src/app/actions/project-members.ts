"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateMemberProfile(memberId: string, data: { display_name: string, avatar_url: string }) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_members")
    .update({
      display_name: data.display_name,
      avatar_url: data.avatar_url,
    })
    .eq("id", memberId);

  if (error) throw error;

  revalidatePath("/project", "layout");
}