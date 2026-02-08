import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Music, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { ProjectHeader } from "@/components/ProjectHeader";
import { CreateTrackBtn } from "@/components/CreateTrackBtn"; 

import { OnboardingGuide } from "./OnboardingGuide";
import { InviteSection } from "./InviteSection";
import { TrackItemActions } from "./TrackItemActions";
import { MemberActions } from "./MemberActions";

export const revalidate = 0;

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  // 1. 嘗試獲取專案資料 (RPC)
  const { data: projectContext } = await supabase.rpc('get_project_data', { p_id: id });
  
  let project = projectContext?.project;
  let tracks = projectContext?.tracks || [];

  // 🚀 關鍵修正：
  // 不管 RPC 有沒有回傳 members，我們都 "強制" 重新抓一次成員資料
  // 這樣才能確保使用 .select('*, profiles(...)') 語法拿到頭像
  const { data: membersData } = await supabase
    .from("project_members")
    .select(`
      *,
      profiles (
        avatar_url,
        display_name
      )
    `)
    .eq("project_id", id);

  // 使用我們剛抓到的完整資料 (包含 profiles)
  let members = membersData || [];

  // 3. Fallback: 如果 RPC 連專案都沒抓到 (例如 RPC 沒寫好或報錯)，才跑這裡
  if (!project) {
    const pRes = await supabase.from("projects").select("*").eq("id", id).single();
    if (pRes.error) {
       return notFound();
    }
    project = pRes.data;
    
    // tracks 也要補抓 (因為上面 RPC 可能失敗)
    const tRes = await supabase.from("tracks").select("*, audio_assets(*)").eq("project_id", id).order("created_at", { ascending: false });
    tracks = tRes.data || [];
  }

  // 4. 計算權限
  const currentMember = (members as any[])?.find(m => m.user_id === user.id);
  const isOwner = currentMember?.role === 'owner';
  const canEdit = isOwner || currentMember?.role === 'admin';
  const isNewMember = !currentMember?.display_name;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <OnboardingGuide projectId={id} isNewMember={isNewMember} />
      
      <ProjectHeader 
        project={project} 
        currentUserRole={currentMember?.role} 
      />

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側：音軌列表 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-400 tracking-wider uppercase">歌曲清單</h2>
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-600">{tracks.length} songs</span>
              {canEdit && (
                <CreateTrackBtn projectId={id} />
              )}
            </div>
          </div>

          <div className="space-y-3">
            {tracks.length === 0 ? (
                <div className="text-zinc-500 text-sm py-8 text-center border border-dashed border-zinc-800 rounded-xl">
                    尚未上傳任何音軌
                </div>
            ) : (
                tracks.map((track: any) => (
                  <div key={track.id} className="relative group">
                    <Link href={`/project/${id}/track/${track.id}`} className="block">
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:bg-zinc-900 hover:border-zinc-700 transition-all pr-12">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                            <Music className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-zinc-200">{track.name}</h3>
                            <p className="text-xs text-zinc-500">{track.audio_assets?.length || 0} versions</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                      <TrackItemActions track={track} canEdit={canEdit} />
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* 右側：側邊欄 */}
        <div className="space-y-6">
          <div className="border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3 h-3" /> 專案成員
              </h3>
              <span className="text-xs text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">
                {members.length}
              </span>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {members.length === 0 ? (
                  <p className="text-zinc-500 text-xs">暫無成員</p>
              ) : (
                  members.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 border border-zinc-700">
                          {/* ✅ 這裡現在可以抓到 avatar_url 了，因為上面的 query 有包含 profiles */}
                          <AvatarImage 
  src={member.profiles?.avatar_url || ""} 
  className="object-cover" 
/>
                          <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                            {member.display_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-zinc-200">
                            {member.display_name || "未命名"}
                          </span>
                          <MemberActions 
                            member={member} 
                            isOwner={isOwner} 
                            isSelf={member.user_id === user.id} 
                          />
                        </div>
                      </div>
                      {member.user_id === user.id && (
                        <span className="text-[10px] text-blue-500 font-bold px-2 tracking-widest">YOU</span>
                      )}
                    </div>
                  ))
              )}
            </div>

            <div className="px-5 pb-5">
              <InviteSection projectId={id} /> 
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}