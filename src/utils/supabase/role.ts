import { createClient } from "@/utils/supabase/server";

export type ProjectRole = 'owner' | 'admin' | 'viewer' | null;

export async function getCurrentUserRole(projectId: string): Promise<ProjectRole> {
  const supabase = await createClient();
  
  // ✅ 透過 View 獲取，這在你的 Dashboard 已經驗證是正常的
  const { data } = await supabase
    .from("my_projects")
    .select("my_role")
    .eq("id", projectId)
    .maybeSingle();

  return (data?.my_role as ProjectRole) || null;
}