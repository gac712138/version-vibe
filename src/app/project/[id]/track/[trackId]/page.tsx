import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileAudio } from "lucide-react"; // 記得保留用到的圖示
import Link from "next/link";
import { UploadVersionBtn } from "@/components/UploadVersionBtn";
import { TrackPlayer } from "@/components/TrackPlayer";

interface TrackPageProps {
  params: Promise<{ id: string; trackId: string }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id, trackId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: track } = await supabase
    .from("tracks")
    .select(`
      *,
      projects:project_id ( name ),
      audio_assets (*)
    `)
    .eq("id", trackId)
    .eq("project_id", id)
    .single();

  if (!track) return notFound();

  // 依照版本號倒序排列 (最新的 V 在最上面)
  const versions = track.audio_assets?.sort((a: any, b: any) => b.version_number - a.version_number) || [];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header (保持不變) */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/project/${id}`}>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-0.5">
                <span>{track.projects?.name}</span>
                <span>/</span>
                <span>Track {track.sort_order || 0}</span>
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
          /* Empty State (保持不變) */
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
             {/* ... 這裡保留原本的 Empty State 代碼 ... */}
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
            {/* 這裡也可以放 Upload 按鈕 */}
             <div className="mt-4">
               <UploadVersionBtn projectId={id} trackId={trackId} />
             </div>
          </div>
        ) : (
          /* 把原本的 map 列表換成我們的播放器元件 */
          <TrackPlayer projectId={id} versions={versions} />
        )}
      </main>
    </div>
  );
}