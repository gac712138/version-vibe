"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Chrome, Music2, Loader2 } from "lucide-react"; 
import { useState } from "react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    const supabase = createClient();
    
    try {
      // 呼叫 Supabase 的 Google OAuth 登入
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // 登入成功後，Google 會把使用者踢回這個網址
          redirectTo: `${location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
      
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoading(false); // 失敗才關閉 loading，成功的話會跳轉所以不用關
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      {/* 卡片容器：使用 zinc 色系與 backdrop-blur 增加質感 */}
      <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center shadow-2xl backdrop-blur-sm">
        
        {/* Logo 與標題區 */}
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-blue-600/20 rounded-full ring-1 ring-blue-500/50">
            <Music2 className="h-10 w-10 text-blue-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter text-white">
              VersionVibe
            </h1>
            <p className="text-zinc-400 text-sm">
              專業混音交付與版本管理平台
            </p>
          </div>
        </div>
        
        {/* 登入按鈕區 */}
        <div className="pt-4 space-y-4">
          <Button 
            onClick={handleLogin}
            disabled={isLoading}
            size="lg" 
            className="w-full gap-2 bg-white text-black hover:bg-zinc-200 font-bold h-12 text-base transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Chrome className="h-5 w-5" />
            )}
            {isLoading ? "登入中..." : "使用google登入"}
          </Button>
          
          <p className="text-xs text-zinc-600 px-8 leading-relaxed">
            點了繼續，代表您同意平台的服務與隱私權政策
          </p>
        </div>
      </div>
    </div>
  );
}