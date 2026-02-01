import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

interface InvitePageProps {
  // 在新版 Next.js 中，params 是一個 Promise，需要等待
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  // 1. 等待 params 解析，取得 token
  const { token } = await params;
  
  if (!token) {
    return <div>無效的邀請連結</div>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 2. 如果使用者沒登入，導向登入頁
  if (!user) {
    // 獲取 headers (新版也是非同步的)
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    
    // 這裡其實不需要完整 URL，用相對路徑即可，更安全且簡單
    const callbackPath = `/invite/${token}`;
    
    // 導向登入頁，並帶上 next 參數
    return redirect(`/login?next=${encodeURIComponent(callbackPath)}`);
  }

  // 3. 驗證邀請碼邏輯 (保持不變)
  const { data: inviteData, error: inviteError } = await supabase
    .from("project_invites")
    .select("*")
    .eq("token", token)
    .single();

  if (inviteError || !inviteData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="p-8 border border-red-500/50 rounded-xl bg-red-950/20">
          <h1 className="text-xl font-bold text-red-500 mb-2">邀請連結無效或已過期</h1>
          <p className="text-zinc-400">請聯繫專案擁有者重新發送。</p>
        </div>
      </div>
    );
  }

  // 4. 檢查是否已經是成員
  const { data: existingMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", inviteData.project_id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    return redirect(`/project/${inviteData.project_id}`);
  }

  // 5. 加入成員
  const { error: joinError } = await supabase
    .from("project_members")
    .insert({
      project_id: inviteData.project_id,
      user_id: user.id,
      role: inviteData.role || "viewer",
      joined_at: new Date().toISOString(),
    });

  if (joinError) {
    return <div>加入失敗: {joinError.message}</div>;
  }

  return redirect(`/project/${inviteData.project_id}`);
}