import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { TrackPlayer } from "@/features/player/components/TrackPlayer";
import { TrackHeader } from "@/features/tracks/components/TrackHeader";
import { Button } from "@/components/ui/button";
import { FileAudio, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UploadVersionBtn } from "@/features/player/components/UploadVersionBtn";
import type { ProjectRole } from "@/utils/supabase/role";

export const revalidate = 0;

interface TrackPageProps {
  params: Promise<{ id: string; trackId: string }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  // ✅ 1. Next.js 15: params 必須 await
  const { id: projectId, trackId } = await params;
  
  // ✅ 2. Supabase client 必須 await
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  // 3. 抓取 Track & Project 資訊
  const { data: context, error: rpcError } = await supabase
    .rpc('get_track_detail_context', { p_track_id: trackId });

  if (rpcError || !context || !context.track) {
    console.error("❌ [Track Page RPC Error]:", rpcError?.message);
    return notFound();
  }

  // 4. 抓取 Assets (Versions) 與留言數
  const { data: assetsWithCounts } = await supabase
    .from("audio_assets")
    .select(`
      *,
      comment_count:comments(count)
    `)
    .eq("track_id", trackId);

  const { track, project } = context;
  const assets = assetsWithCounts || [];

  // 5. 抓取權限
  const { data: projectData } = await supabase
    .from("my_projects")
    .select("my_role")
    .eq("id", projectId)
    .maybeSingle();

  const role = (projectData?.my_role || 'viewer') as ProjectRole;
  const canEdit = role === 'owner' || role === 'admin';

  // 版本排序
  const versions = assets.sort((a: any, b: any) => b.version_number - a.version_number);

  // 構造完整的 track 物件給 Header 用
  const trackForHeader = {
    id: track.id,
    name: track.name,
    project_id: projectId,
    projects: { name: project?.name || "未知專案" }
  };

  return (
    // ✅ 關鍵佈局：fixed inset-0 z-50 強制接管視窗，蓋過 Global Header
    <div className="fixed inset-0 z-50 bg-black flex flex-col text-white overflow-hidden">
      
      {/* 頂部：TrackHeader (固定高度) */}
      <div className="shrink-0 z-20">
        <TrackHeader track={trackForHeader} currentUserRole={role} />
      </div>

      {/* 下方：內容區域 (填滿剩餘空間) */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {versions.length === 0 ? (
          // 空狀態 (置中顯示)
          <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-6 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 max-w-md w-full">
               <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                <div className="relative p-6 bg-zinc-900 rounded-full ring-1 ring-zinc-800">
                  <FileAudio className="h-10 w-10 text-zinc-400" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">新增你的第一版混音</h3>
                <p className="text-zinc-500 text-sm">上傳 MP3 或 WAV 檔案開始協作</p>
              </div>
               <div className="mt-4">
                 {canEdit ? (
                   <UploadVersionBtn projectId={projectId} trackId={trackId} />
                 ) : (
                   <p className="text-xs text-zinc-600 italic">您沒有權限上傳音檔</p>
                 )}
               </div>
            </div>
          </div>
        ) : (
          // 播放器區域 (填滿)
          <TrackPlayer 
            projectId={projectId} 
            versions={versions} 
            canEdit={canEdit} 
          />
        )}
      </div>
    </div>
  );
}