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

  // 1. 透過 RPC 一次拿齊所有資料 (Project + Members + Tracks)
  const { data: projectContext, error: rpcError } = await supabase
    .rpc('get_project_data', { p_id: id });

  if (rpcError || !projectContext || !projectContext.project) {
    console.error("❌ [RPC Error]:", rpcError?.message);
    return notFound();
  }

  // ✅ 從 RPC 結果解構出所有資料
  const { project, members, tracks } = projectContext;

  const currentMember = (members as any[])?.find(m => m.user_id === user.id);
  if (!currentMember) return notFound();

  const role = currentMember.role;
  const canEdit = role === 'owner' || role === 'admin';
  const isNewMember = !currentMember.display_name || currentMember.display_name.trim() === "";

  // ⚠️ 移除原本這裡的 supabase.from("tracks") 查詢，因為上面已經拿到了

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <OnboardingGuide projectId={id} isNewMember={isNewMember} />
      <ProjectHeader project={project} currentUserRole={role} />

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-400 tracking-wider uppercase">Tracks</h2>
            <div className="flex items-center gap-4">
              {/* ✅ 使用 tracks.length */}
              <span className="text-xs text-zinc-600">{(tracks as any[])?.length || 0} songs</span>
              {canEdit && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white gap-2 h-8">
                  <Plus className="w-4 h-4" /> Add Track
                </Button>
              )}
            </div>
          </div>

          {/* ✅ 列表渲染邏輯 */}
          {!tracks || (tracks as any[]).length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
              <Music className="w-10 h-10 mx-auto mb-4 opacity-50" />
              <p>尚未上傳任何音軌</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(tracks as any[]).map((track) => (
                <div key={track.id} className="relative group">
                  <Link href={`/project/${id}/track/${track.id}`} className="block">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:bg-zinc-900 hover:border-zinc-700 transition-all pr-12">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                          <Music className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-200 group-hover:text-white">{track.name}</h3>
                          <p className="text-xs text-zinc-500">
                            {track.audio_assets?.length || 0} versions
                          </p>
                        </div>
                      </div>
                      <ArrowLeft className="w-5 h-5 text-zinc-600 rotate-180 group-hover:text-white transition-all" />
                    </div>
                  </Link>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                    <TrackItemActions track={track} canEdit={canEdit} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右側：側邊欄 (管理與成員列表) */}
        <div className="space-y-6">
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-3 h-3" /> Project Management
            </h3>
            <InviteSection projectId={id} /> 
          </div>

          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Member List</h3>
              <span className="text-xs text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">{members?.length || 0}</span>
            </div>
            <div className="space-y-3">
              {members && (members as any[]).map((member) => (
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
                    <span className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                      {member.role}
                      {member.user_id === user.id && <span className="text-blue-500 font-bold">(You)</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}