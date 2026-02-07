import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";

export default async function ProjectJoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  
  // 1. 因為經過了 auth/callback，這裡現在讀得到 user 了！
  const { data: { user } } = await supabase.auth.getUser();

  // 如果還是沒抓到 user (極少見)，才踢回邀請頁
  if (!user) {
    console.error("Join Page: No user found, redirecting to invite.");
    redirect(`/invite/${projectId}`);
  }

  // 2. 檢查是否已經是成員
  const { data: existingMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    // A. 已經是成員 -> 直接進入專案
    console.log("User is already a member, redirecting to project.");
    redirect(`/project/${projectId}`);
  } else {
    // B. 不是成員 -> 加入資料庫
    console.log("Adding new member...");

    // 注意：這裡我們只寫入必要資訊
    // 我們可以選擇不寫入 display_name，這樣進入 Project Page 時
    // isNewMember = !currentMember.display_name 就會是 true，進而觸發 OnboardingGuide
    const { error } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: user.id,
        role: "viewer", // 預設權限
        // display_name: user.user_metadata.full_name // ❌ 註解掉這行，讓 OnboardingGuide 跳出來給使用者自己填
      });

    if (error) {
      console.error("Failed to join project:", error);
      // 錯誤處理 (可選)
    }
  }

  // 3. 加入完成 -> 進入專案 (這時候會觸發 OnboardingGuide)
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