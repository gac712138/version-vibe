import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";

export default async function ProjectJoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("Join Page: No user found, redirecting to invite.");
    redirect(`/invite/${projectId}`);
  }

  // 檢查是否已經是成員/join/page]
  const { data: existingMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    redirect(`/project/${projectId}`);
  } else {
    // ✅ 步驟 1：先抓取受邀者的 Profile 資訊
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name") // 確認您的欄位名稱是 display
      .eq("id", user.id)
      .single();

    // ✅ 步驟 2：直接寫入資料庫，不留白/join/page]
    const { error } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: user.id,
        role: "viewer",
        // 自動帶入全域暱稱，這會讓 OnboardingGuide 的 isNewMember 判定為 false
        display_name: profile?.display_name || "新成員" 
      });

    if (error) {
      console.error("Failed to join project:", error);
    }
  }

  // 加入完成 -> 進入專案 (現在會直接跳過 Onboarding)
  redirect(`/project/${projectId}`);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p>正在加入專案...</p>
      </div>
    </div>
  );
}