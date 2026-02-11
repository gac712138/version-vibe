import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileAudio } from "lucide-react"; 
import Link from "next/link";
import { UploadVersionBtn } from "@/components/UploadVersionBtn";
import { TrackPlayer } from "@/components/TrackPlayer";

export const revalidate = 0;

interface TrackPageProps {
  params: Promise<{ id: string; trackId: string }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id, trackId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: context, error: rpcError } = await supabase
    .rpc('get_track_detail_context', { p_track_id: trackId });

  if (rpcError || !context || !context.track) {
    console.error("❌ [Track Page RPC Error]:", rpcError?.message);
    return notFound();
  }

  const { data: assetsWithCounts } = await supabase
    .from("audio_assets")
    .select(`
      *,
      comment_count:comments(count)
    `)
    .eq("track_id", trackId);

  const { track, project } = context;
  const assets = assetsWithCounts || [];

  const { data: projectData } = await supabase
    .from("my_projects")
    .select("my_role")
    .eq("id", id)
    .maybeSingle();

  const role = projectData?.my_role || 'viewer';
  const canEdit = role === 'owner' || role === 'admin';

  const versions = assets.sort((a: any, b: any) => b.version_number - a.version_number);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
        {/* ✅ 修改：使用 max-w-full 並減少 px 以縮減左右距離 */}
        <div className="max-w-full mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
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
            {canEdit && <UploadVersionBtn projectId={id} trackId={trackId} />}
          </div>
        </div>
      </header>

      {/* ✅ 修改：這裡改為 px-2 並放寬最大寬度 */}
      <main className="flex-1 max-w-full mx-auto w-full p-2 md:p-6">
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
             <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
              <div className="relative p-6 bg-zinc-900 rounded-full ring-1 ring-zinc-800">
                <FileAudio className="h-10 w-10 text-zinc-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">新增你的第一版混音</h3>
              <p className="text-zinc-500 max-w-sm mx-auto text-sm">上傳mp3 或 WAV檔案.</p>
            </div>
             <div className="mt-4">
               {canEdit ? <UploadVersionBtn projectId={id} trackId={trackId} /> : (
                 <p className="text-xs text-zinc-600 italic">您目前的權限為 Viewer，無權限上傳音檔</p>
               )}
             </div>
          </div>
        ) : (
          <TrackPlayer projectId={id} versions={versions} canEdit={canEdit} />
        )}
      </main>
    </div>
  );
}