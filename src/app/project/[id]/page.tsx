import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Music, Users, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectHeader } from "@/components/ProjectHeader";
import { OnboardingGuide } from "./OnboardingGuide";
import { InviteSection } from "./InviteSection";
import { TrackItemActions } from "./TrackItemActions";
import { MemberActions } from "./MemberActions";
// ✅ 強制每次請求都重新獲取資料，確保身分狀態與成員名單是最新的
export const revalidate = 0;

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: projectContext } = await supabase.rpc('get_project_data', { p_id: id });
  if (!projectContext) return notFound();

  const { project, members, tracks } = projectContext;
  const currentMember = (members as any[])?.find(m => m.user_id === user.id);
  const isOwner = currentMember?.role === 'owner';
  const canEdit = isOwner || currentMember?.role === 'admin';
  const isNewMember = !currentMember?.display_name;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <OnboardingGuide projectId={id} isNewMember={isNewMember} />
      <ProjectHeader project={project} currentUserRole={currentMember?.role} />

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側：音軌列表 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-400 tracking-wider uppercase">Tracks</h2>
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-600">{(tracks as any[])?.length || 0} songs</span>
              {canEdit && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white gap-2 h-8">
                  <Plus className="w-4 h-4" /> Add Track
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {(tracks as any[]).map((track) => (
              <div key={track.id} className="relative group">
                <Link href={`/project/${id}/track/${track.id}`} className="block">
                  {/* ✅ 已移除 pr-12 內的 ArrowLeft */}
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
            ))}
          </div>
        </div>

        {/* 右側：整合後的側邊欄 */}
        <div className="space-y-6">
  <div className="border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden">
    {/* Header */}
    <div className="p-5 flex items-center justify-between">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
        <Users className="w-3 h-3" /> Team Members
      </h3>
      <span className="text-xs text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">
        {members?.length || 0}
      </span>
    </div>

    {/* 1. 成員列表 (移至上方) */}
    {/* 側邊欄成員列表循環 */}
<div className="px-5 pb-5 space-y-3">
  {members && (members as any[]).map((member) => (
    <div key={member.id} className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <Avatar className="w-8 h-8 border border-zinc-700">
          {/* ... Avatar 配置 ... */}
        </Avatar>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-zinc-200">
            {member.display_name || "未命名"}
          </span>
          {/* ✅ 這裡會渲染出精緻的角色彈窗按鈕 */}
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
  ))}
</div>

    {/* 2. 邀請區塊 (移至下方，移除上方邊框與標題) */}
    <div className="px-5 pb-5">
      <InviteSection projectId={id} /> 
    </div>
  </div>
</div>
      </main>
    </div>
  );
}