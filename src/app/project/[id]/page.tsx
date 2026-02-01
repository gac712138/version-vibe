import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Music, ChevronRight } from "lucide-react";
import Link from "next/link";
import { CreateTrackBtn } from "@/components/CreateTrackBtn"; // 引入剛寫好的按鈕

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  // 驗證與權限 (與之前相同，略過重複檢查代碼以保持簡潔，實際專案請保留)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  // 撈取專案
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) return notFound();

  // 撈取 Tracks (依照建立時間或排序欄位)
  const { data: tracks } = await supabase
    .from("tracks")
    .select("*, audio_assets(count)") // 順便撈一下每個 Track 有幾個版本 (assets)
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                {project.name}
              </h1>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* 這裡放入新增歌曲按鈕，並把 projectId 傳進去 */}
          <CreateTrackBtn projectId={project.id} />
        </div>
      </header>

      {/* Track List */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-4">
        <div className="flex items-center justify-between mb-2 px-2">
          <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Tracks</h2>
          <span className="text-zinc-500 text-xs">{tracks?.length || 0} songs</span>
        </div>

        {(!tracks || tracks.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <p className="text-zinc-500 mb-4">No tracks yet. Add your first song to start.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {tracks.map((track) => (
              <Link key={track.id} href={`/project/${project.id}/track/${track.id}`}>
                <div className="group flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-blue-500/50 hover:bg-zinc-900 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-zinc-800 rounded-full text-zinc-400 group-hover:text-blue-400 group-hover:bg-blue-900/20 transition-colors">
                      <Music className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                        {track.name}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {/* 顯示版本數量 (如果是 0 就顯示 No versions) */}
                        {track.audio_assets && track.audio_assets[0]?.count > 0 
                          ? `${track.audio_assets[0].count} versions` 
                          : "No versions yet"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-zinc-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}