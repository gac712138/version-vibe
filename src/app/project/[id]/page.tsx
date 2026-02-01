import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Music, ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { CreateTrackBtn } from "@/components/CreateTrackBtn";
import { InviteSection } from "./InviteSection"; // 因為檔案就在同一個資料夾下
import { OnboardingGuide } from "./OnboardingGuide";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  // 1. 驗證使用者身份
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  // 2. 撈取專案資訊與成員狀態
  // 同時抓取當前使用者在該專案的成員紀錄，用來判斷是否需要 Onboarding
  const [projectRes, memberRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("project_members").select("*").eq("project_id", id).eq("user_id", user.id).single()
  ]);

  const project = projectRes.data;
  const currentMember = memberRes.data;

  if (!project) return notFound();

  // 3. 撈取 Tracks (包含版本計數)
  const { data: tracks } = await supabase
    .from("tracks")
    .select("*, audio_assets(count)")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* 全域引導視窗：若成員未設定 display_name 則會彈出 */}
      <OnboardingGuide member={currentMember} user={user} />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
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
          
          <CreateTrackBtn projectId={project.id} />
        </div>
      </header>

      {/* Main Content: 兩欄式佈局 */}
      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-8 p-4 md:p-8">
        
        {/* 左側：歌曲列表 (佔據主要寬度) */}
        <main className="flex-1 space-y-4">
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

        {/* 右側：側邊欄 (管理與邀請區塊) */}
        <aside className="w-full md:w-80 space-y-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400 px-2">
              <Users className="h-4 w-4" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">Project Management</h2>
            </div>
            
            {/* 邀請連結區塊 */}
            <InviteSection projectId={project.id} />
            
            {/* 這裡未來可以放成員列表 (Member List) */}
            <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
              <h3 className="text-xs text-zinc-500 mb-2">Member List</h3>
              <p className="text-[10px] text-zinc-600">Only you can see this for now.</p>
            </div>
          </section>
        </aside>

      </div>
    </div>
  );
}