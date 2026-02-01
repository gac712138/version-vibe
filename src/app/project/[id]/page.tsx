import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
// ❌ 移除 dynamic import
// import dynamic from "next/dynamic"; 

import { Button } from "@/components/ui/button";
import { Plus, Music, Users, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ✅ 改成標準匯入 (因為 OnboardingGuide 裡面已經有 "use client")
import { OnboardingGuide } from "./OnboardingGuide";

// 假設你有一個邀請組件 (如果沒有，可以先註解掉)
import { InviteSection } from "./InviteSection"; 

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. 驗證登入
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  // 2. 獲取專案資訊
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return <div className="text-white p-10">找不到專案或無權限訪問</div>;
  }

  // 3. 獲取專案下的 Tracks (音軌)
  const { data: tracks } = await supabase
    .from("tracks") 
    .select("*, audio_assets(*)") 
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // 4. 獲取成員列表 (Member List)
  const { data: members } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", id);

  // 5. 檢查當前使用者是否為新成員 (用於 Onboarding)
  const currentMember = members?.find(m => m.user_id === user.id);
  // 如果找不到 display_name，視為新成員
  const isNewMember = !currentMember?.display_name;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* 新成員引導彈窗 */}
      <OnboardingGuide 
        projectId={id} 
        isNewMember={isNewMember} 
      />

      {/* Header */}
      <header className="border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-zinc-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">{project.name}</h1>
              <p className="text-xs text-zinc-500">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
            <Plus className="w-4 h-4" /> Add Track
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側：音軌列表 (Main Content) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-400 tracking-wider uppercase">Tracks</h2>
            <span className="text-xs text-zinc-600">{tracks?.length || 0} songs</span>
          </div>

          {!tracks || tracks.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
              <Music className="w-10 h-10 mx-auto mb-4 opacity-50" />
              <p>尚未上傳任何音軌</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tracks.map((track) => (
                <Link 
                  key={track.id} 
                  href={`/project/${id}/track/${track.id}`}
                  className="block group"
                >
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:bg-zinc-900 hover:border-zinc-700 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
                        <Music className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-200 group-hover:text-white">{track.name}</h3>
                        <p className="text-xs text-zinc-500">
                          {track.audio_assets?.length || 0} versions
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-zinc-600 rotate-180 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 右側：專案管理 (Sidebar) */}
        <div className="space-y-6">
          {/* 1. 邀請區塊 */}
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-3 h-3" /> Project Management
            </h3>
            <InviteSection projectId={id} /> 
          </div>

          {/* 2. 成員列表 (Member List) */}
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Member List
              </h3>
              <span className="text-xs text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">
                {members?.length || 0}
              </span>
            </div>

            <div className="space-y-3">
              {members && members.length > 0 ? (
                members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 border border-zinc-700">
                      <AvatarImage src={member.avatar_url || ""} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                        {member.display_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-200">
                        {member.display_name || "未命名成員"}
                      </span>
                      <span className="text-[10px] text-zinc-500 uppercase">
                        {member.role || "Member"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">暫無成員</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}