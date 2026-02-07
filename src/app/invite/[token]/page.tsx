"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Music2, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";

export default function InvitePage() {
  const params = useParams();
  const projectId = (params?.token as string) || (params?.id as string);
  
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null); // ✅ 新增專案名稱狀態
  const supabase = createClient();
  const router = useRouter();

  // ✅ 新增：嘗試抓取專案名稱
  useEffect(() => {
    async function fetchProjectName() {
      if (!projectId) return;
      // 注意：這需要您的 RLS 策略允許未登入使用者(anon)讀取 projects 表的 name 欄位
      // 如果讀不到，會顯示 null，介面就不顯示名稱
      const { data } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .maybeSingle();
      
      if (data) {
        setProjectName(data.name);
      }
    }
    fetchProjectName();
  }, [projectId, supabase]);

  if (!projectId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-white">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold">無效的邀請連結</h1>
        <Button 
          variant="outline" 
          className="mt-6 border-zinc-700 text-white"
          onClick={() => router.push("/")}
        >
          回首頁
        </Button>
      </div>
    );
  }

  const handleLogin = async () => {
    setLoading(true);
    const origin = window.location.origin;
    const redirectUrl = `${origin}/auth/callback?next=/project/${projectId}/join`;

    console.log("登入流程將導向:", redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error(error);
      toast.error("登入失敗");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center space-y-6 shadow-2xl">
        <div className="flex justify-center">
          <div className="p-3 bg-blue-600 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            <Music2 className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-white tracking-tight">邀請您加入專案</h1>
          
          {/* ✅ 新增：顯示專案名稱 (如果有抓到的話) */}
          {projectName ? (
               
                <p className="text-3xl font-bold text-blue-400 break-words">{projectName}</p>
             
          ) : (
             <div className="h-2" /> // 佔位
          )}

          <p className="text-zinc-400 text-sm">
             請登入以接受邀請。
          </p>
        </div>

        <div className="pt-2">
          <Button 
            onClick={handleLogin} 
            disabled={loading}
            className="w-full bg-white text-black hover:bg-zinc-200 h-12 text-base font-bold transition-transform active:scale-95"
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
            )}
            使用 Google 繼續
          </Button>
        </div>
      </div>
    </div>
  );
}