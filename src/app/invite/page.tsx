import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = await createClient();
  const { token } = params;

  // 1. 驗證 Token 是否存在且有效
  const { data: invite, error: inviteError } = await supabase
    .from("invitations")
    .select("*, projects(name)")
    .eq("token", token)
    .single();

  if (inviteError || !invite || new Date(invite.expires_at) < new Date()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white bg-[#0a0c10]">
        <h1 className="text-2xl font-bold">邀請連結已失效或過期</h1>
        <p className="text-zinc-400 mt-2">請向專案負責人要求新的連結。</p>
      </div>
    );
  }

  // 2. 檢查使用者是否已登入
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // 未登入，導向登入頁面，登入後再回來到這個邀請頁面
    redirect(`/login?next=/invite/${token}`);
  }

  // 3. 檢查使用者是否已經是成員
  const { data: existingMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", invite.project_id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    // 已經是成員了，直接導向專案頁面
    redirect(`/project/${invite.project_id}`);
  }

  // 4. 加入成員 (預設角色為 viewer)
  const { error: joinError } = await supabase.from("project_members").insert({
    project_id: invite.project_id,
    user_id: user.id,
    role: "viewer", // 預設權限
  });

  if (joinError) throw joinError;

  // 5. 更新邀請使用次數 (選填)
  await supabase
    .from("invitations")
    .update({ uses_count: (invite.uses_count || 0) + 1 })
    .eq("id", invite.id);

  // 6. 成功加入，導向專案頁面 (此時會觸發 Onboarding Guide)
  redirect(`/project/${invite.project_id}`);
}