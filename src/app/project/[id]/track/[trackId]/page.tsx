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

  // ✅ 核心修正：改用 RPC 獲取歌曲詳情、版本列表與專案資訊，徹底避開 RLS 遞迴
  const { data: context, error: rpcError } = await supabase
    .rpc('get_track_detail_context', { p_track_id: trackId });

  // 如果 RPC 報錯或找不到歌曲，才執行 404
  if (rpcError || !context || !context.track) {
    console.error("❌ [Track Page RPC Error]:", rpcError?.message);
    return notFound();
  }

  const { track, assets, project } = context;

  // 依照版本號倒序排列 (最新的 V 在最上面)
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
                {/* ✅ 改從 RPC 獲取的 project 物件拿名稱 */}
                <span>{project?.name}</span>
              </div>
              
              <h1 className="text-lg font-bold flex items-center gap-2">
                {track.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <UploadVersionBtn projectId={id} trackId={trackId} />
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
               <UploadVersionBtn projectId={id} trackId={trackId} />
             </div>
          </div>
        ) : (
          /* ✅ 傳入排序後的 versions */
          <TrackPlayer projectId={id} versions={versions} />
        )}
      </main>
    </div>
  );
}