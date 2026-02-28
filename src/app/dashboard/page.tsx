import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Music2 } from "lucide-react";
import { CreateProjectBtn } from "@/features/projects/components/CreateProjectBtn";
import { ProjectCard } from "@/features/projects/components/ProjectCard";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: projects, error } = await supabase
    .from("my_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) console.error("Error fetching projects:", error);
  const projectList = projects || [];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">我的專案</h1>
            <p className="text-zinc-400 mt-1 hidden sm:block">
              歡迎回來, {user.user_metadata.full_name || user.email}
            </p>
          </div>
          <CreateProjectBtn />
        </div>

        {/* Project Grid */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {projectList.map((project) => (
    <ProjectCard key={project.id} project={project} />
  ))}

          {/* Empty State */}
          {projectList.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 text-center text-zinc-500">
               <Music2 className="h-10 w-10 mb-4 opacity-20" />
               <p>目前沒有任何專案，新增一個吧！</p>
               <div className="mt-4"><CreateProjectBtn /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}