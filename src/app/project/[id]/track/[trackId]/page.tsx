import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileAudio } from "lucide-react"; 
import Link from "next/link";
import { UploadVersionBtn } from "@/components/UploadVersionBtn";
import { TrackPlayer } from "@/components/TrackPlayer";

// ✅ 強制每次請求都重新獲取資料
export const revalidate = 0;

interface TrackPageProps {
  params: Promise<{ id: string; trackId: string }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id, trackId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  // 1. 透過 RPC 獲取歌曲詳情 (避開 RLS 遞迴)
  const { data: context, error: rpcError } = await supabase
    .rpc('get_track_detail_context', { p_track_id: trackId });

  if (rpcError || !context || !context.track) {
    console.error("❌ [Track Page RPC Error]:", rpcError?.message);
    return notFound();
  }

  const { track, assets, project } = context;

  // 2. 🛡️ 獲取當前使用者角色並判斷編輯權限
  // 透過穩定的 my_projects View 獲取角色，避免觸發 project_members 的遞迴錯誤
  const { data: projectData } = await supabase
    .from("my_projects")
    .select("my_role")
    .eq("id", id)
    .maybeSingle();

  const role = projectData?.my_role || 'viewer';
  // 只有 owner 或 admin 具備編輯與上傳權限
  const canEdit = role === 'owner' || role === 'admin';

  // 依照版本號倒序排列
  const versions = (assets || []).sort((a: any, b: any) => b.version_number - a.version_number);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/project/${id}`}>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            
            <div className="flex flex-col">
              <div className="text-xs text-zinc-500 mb-0.5">
                <span>{project?.name}</span>
              </div>
              
              <h1 className="text-lg font-bold flex items-center gap-2">
                {track.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ 只有非 Viewer 才能看到標頭的上傳按鈕 */}
            {canEdit && <UploadVersionBtn projectId={id} trackId={trackId} />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
        
        {versions.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
             <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
              <div className="relative p-6 bg-zinc-900 rounded-full ring-1 ring-zinc-800">
                <FileAudio className="h-10 w-10 text-zinc-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Upload your first mix</h3>
              <p className="text-zinc-500 max-w-sm mx-auto text-sm">
                Upload a WAV or MP3 file to create Version 1.
              </p>
            </div>
             <div className="mt-4">
               {/* ✅ 空狀態的上傳按鈕同樣受權限控管 */}
               {canEdit ? (
                 <UploadVersionBtn projectId={id} trackId={trackId} />
               ) : (
                 <p className="text-xs text-zinc-600 italic">您目前的權限為 Viewer，無權限上傳音檔</p>
               )}
             </div>
          </div>
        ) : (
          /* ✅ 傳入 canEdit 讓播放器決定是否顯示「重新命名」或「刪除」選單 */
          <TrackPlayer projectId={id} versions={versions} canEdit={canEdit} />
        )}
      </main>
    </div>
  );
}