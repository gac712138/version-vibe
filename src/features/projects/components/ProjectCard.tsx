import Link from "next/link";
import { Music2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Project {
  id: string;
  name: string;
  cover_url?: string | null;
  created_at: string;
  my_role: string;
}

export function ProjectCard({ project }: { project: Project }) {
  const hasCover = !!project.cover_url;

  return (
    <Link href={`/project/${project.id}`} className="group block w-full">
      <Card className="relative h-[160px] w-full overflow-hidden rounded-3xl border-zinc-800 bg-[#18181b] transition-all hover:bg-zinc-900/80 flex flex-row p-0 shadow-sm hover:shadow-md hover:border-blue-500/30">
        
        {/* 左側：文字資訊區塊 (z-20 確保在最上層) */}
        <div className="flex-1 flex flex-col justify-between pl-6 py-6 pr-0 min-w-0 z-20">
          <div className="min-w-0">
            <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors mb-3 tracking-tight truncate">
              {project.name}
            </h3>
            
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#1e293b] text-blue-400 border border-blue-800/50">
              {project.my_role}
            </span>
          </div>

          <div className="text-sm text-zinc-500 font-mono font-medium">
            {new Date(project.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* 右側：視覺區塊 (shrink-0 確保正方形，z-10 在文字下方) */}
        <div className="relative h-full aspect-square shrink-0 overflow-hidden flex items-end justify-end z-10">
          {hasCover ? (
            <div className="p-4 w-full h-full">
              <img 
                src={project.cover_url!} 
                alt={project.name}
                className="h-full w-full object-cover rounded-2xl shadow-sm transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ) : (
            /* ✅ 音符 Logo 調整重點：
               1. 移除負數 offset，改用 bottom-0 right-0。
               2. w-full h-full 配合容器的 aspect-square，確保它是 160x160 的完整正方形。
               3. 移除造成裁切的超大尺寸 (w-60)，改用與卡片高度一致的尺寸。
            */
            <Music2 
              className="w-full h-full text-[#202436] opacity-90 group-hover:text-blue-900/40 transition-colors duration-500 pointer-events-none translate-x-4 translate-y-4" 
              strokeWidth={1.5}
            />
          )}
        </div>
      </Card>
    </Link>
  );
}