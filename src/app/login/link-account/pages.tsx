"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner"; // 假設你有裝 toast，如果沒有可換成 alert 或自訂錯誤顯示

function LinkAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  // 從 URL 取得 LINE 傳過來的資料
  const lineId = searchParams.get("lineId");
  const lineName = searchParams.get("name");

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. 發送驗證碼
  const handleSendOtp = async () => {
    if (!email) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          // 這裡不設 shouldCreateUser: false，因為我們允許新用戶註冊
        },
      });

      if (error) throw error;

      setStep("otp");
      // 如果你有 toast 可以用: toast.success("驗證碼已發送至您的信箱");
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "發送失敗，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 驗證並綁定
  const handleVerifyAndLink = async () => {
    if (!otp || !lineId) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      // A. 驗證 OTP (這會同時完成登入)
      const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (verifyError) throw verifyError;
      if (!session?.user) throw new Error("驗證失敗，無法取得使用者資訊");

      // B. 登入成功後，將 LINE ID 寫入使用者的 Profile
      // 注意：這需要 RLS 允許使用者 update 自己的 profile (通常預設是允許的)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ line_user_id: lineId })
        .eq("id", session.user.id);

      if (updateError) {
        console.error("綁定 LINE ID 失敗:", updateError);
        // 雖然綁定失敗但使用者已登入，這裡可以選擇報錯或繼續
        // 建議：還是讓使用者進去，但提示綁定可能有問題
      }

      // C. 成功，跳轉回首頁
      router.push("/");
      router.refresh();

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "驗證碼錯誤或過期");
    } finally {
      setIsLoading(false);
    }
  };

  if (!lineId) {
    return (
      <div className="text-center text-zinc-400">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
        <p>無效的連結，請重新由 LINE 登入</p>
        <Button onClick={() => router.push("/login")} variant="link" className="mt-4 text-white">
          回登入頁
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 shadow-2xl backdrop-blur-sm">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {step === "email" ? "綁定您的帳號" : "輸入驗證碼"}
        </h1>
        <p className="text-zinc-400 text-sm">
          {step === "email" 
            ? `嗨 ${lineName || "朋友"}，請輸入您的信箱以完成 LINE 綁定` 
            : `我們已發送 6 位數驗證碼至 ${email}`}
        </p>
      </div>

      <div className="space-y-4">
        {step === "email" ? (
          // 輸入 Email 階段
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
              <Input 
                type="email" 
                placeholder="name@example.com" 
                className="pl-10 bg-zinc-950/50 border-zinc-700 text-white h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button 
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold"
              onClick={handleSendOtp}
              disabled={isLoading || !email}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "發送驗證碼"}
            </Button>
          </div>
        ) : (
          // 輸入 OTP 階段
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <Input 
              type="text" 
              placeholder="000000" 
              className="bg-zinc-950/50 border-zinc-700 text-white h-12 text-center text-lg tracking-[0.5em] font-mono"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <Button 
              className="w-full h-12 bg-green-600 hover:bg-green-500 text-white font-bold"
              onClick={handleVerifyAndLink}
              disabled={isLoading || otp.length < 6}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <span className="flex items-center">完成綁定 <CheckCircle2 className="ml-2 h-4 w-4"/></span>}
            </Button>
            <button 
              onClick={() => setStep("email")}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 underline"
            >
              更換信箱或重發
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-md bg-red-900/20 border border-red-900/50 text-red-200 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

// Next.js 要求使用 useSearchParams 的組件必須包在 Suspense 裡
export default function LinkAccountPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white p-4">
      <Suspense fallback={<div className="text-zinc-500">載入中...</div>}>
        <LinkAccountContent />
      </Suspense>
    </div>
  );
}