import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music2, Clock, Plus } from "lucide-react";
import { CreateProjectBtn } from "@/components/CreateProjectBtn"; 

export default async function Dashboard() {
  // 1. 建立 Supabase Client (注意：Next.js 15 需要 await)
  const supabase = await createClient();
  
  // 2. 檢查使用者是否登入
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  // 3. 撈取專案邏輯：
  // 先查 project_members 表，找出這個使用者參與的所有 project_id
  const { data: memberships } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id);

  const projectIds = memberships?.map(m => m.project_id) || [];

  // 再根據 project_id 撈取專案詳細資料
  let projects: any[] = [];
  if (projectIds.length > 0) {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .in("id", projectIds)
      .order("created_at", { ascending: false });
    projects = data || [];
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 標題與建立按鈕區 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-zinc-400 mt-1">
              Welcome back, {user.user_metadata.full_name || user.email}
            </p>
          </div>
          {/* 呼叫 Client Component 按鈕 */}
          <CreateProjectBtn />
        </div>

        {/* 專案列表 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/project/${project.id}`}>
              <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500 hover:ring-1 hover:ring-blue-500/50 transition-all cursor-pointer group relative overflow-hidden h-[200px]">
                {/* 背景裝飾圖示 */}
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                    <Music2 className="w-32 h-32 text-blue-500" />
                </div>
                
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xl group-hover:text-blue-400 transition-colors text-white z-10">
                    <Music2 className="h-5 w-5" />
                    {project.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="z-10 relative">
                  <div className="flex items-center gap-2 mt-4 text-xs text-zinc-500 font-mono">
                    <Clock className="h-3 w-3" />
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                  <div className="mt-4">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                       project.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-zinc-800 text-zinc-400'
                     }`}>
                       {project.status}
                     </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* 若無專案顯示的空狀態 (Empty State) */}
          {projects.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 text-center">
              <div className="bg-zinc-800 p-4 rounded-full mb-4 ring-1 ring-zinc-700">
                <Music2 className="h-8 w-8 text-zinc-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">No projects found</h3>
              <p className="text-zinc-500 mb-6 max-w-sm">
                Get started by creating your first project.
              </p>
              <CreateProjectBtn />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}