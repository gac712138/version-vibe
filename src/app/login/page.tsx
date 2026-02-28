"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Chrome, Music2, Loader2, MessageCircle } from "lucide-react"; 
import { useState, useEffect, Suspense } from "react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const [isLoading, setIsLoading] = useState<"google" | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();

    const handleAuth = async () => {
      const hash = window.location.hash;
      
      // 解析網址 Token
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (data.session) {
            window.location.href = "/dashboard";
            return;
          }
        }
      }

      // 狀態監聽
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          window.location.href = "/dashboard";
        }
      });

      return subscription;
    };

    const authPromise = handleAuth();
    return () => {
      authPromise.then(sub => sub?.unsubscribe());
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading("google");
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch { setIsLoading(null); }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-blue-600/20 rounded-full ring-1 ring-blue-500/50">
            <Music2 className="h-10 w-10 text-blue-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter text-white">VersionVibe</h1>
            <p className="text-zinc-400 text-sm">專業混音交付與版本管理平台</p>
          </div>
        </div>
        
        <div className="pt-4 space-y-3">
          <Button onClick={handleGoogleLogin} disabled={isLoading !== null} size="lg" className="w-full gap-2 bg-white text-black hover:bg-zinc-200 font-bold h-12">
            {isLoading === "google" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Chrome className="h-5 w-5" />}
            使用 Google 登入
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-black text-white">載入中...</div>}>
      <LoginForm />
    </Suspense>
  );
}