import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music2, Clock } from "lucide-react";
import { CreateProjectBtn } from "@/components/CreateProjectBtn"; 

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  // ✅ 核心修改：直接讀取 'my_projects' View
  // 這個 View 已經在資料庫層級幫你處理好：
  // 1. 權限過濾 (只回傳我有參與的專案)
  // 2. 角色資訊 (會多一個 my_role 欄位)
  const { data: projects, error } = await supabase
    .from("my_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching projects:", error);
  }

  const projectList = projects || [];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-zinc-400 mt-1">
              Welcome back, {user.user_metadata.full_name || user.email}
            </p>
          </div>
          <CreateProjectBtn />
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectList.map((project) => (
            <Link key={project.id} href={`/project/${project.id}`}>
              <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500 hover:ring-1 hover:ring-blue-500/50 transition-all cursor-pointer group relative overflow-hidden h-[200px]">
                {/* 背景裝飾 */}
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

                  {/* 標籤區 */}
                  <div className="mt-4 flex gap-2">
                     {/* 狀態標籤 */}
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                       project.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-zinc-800 text-zinc-400'
                     }`}>
                       {project.status || 'Active'}
                     </span>

                     {/* ✅ 角色標籤 (新增：顯示你在這個專案的身分) */}
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-800 uppercase">
                       {project.my_role}
                     </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Empty State */}
          {projectList.length === 0 && (
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