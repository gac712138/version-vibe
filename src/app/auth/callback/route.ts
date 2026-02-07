import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // "next" 參數是我們在 InvitePage 設定的，目的是讓 callback 知道交換完 cookie 後要去哪
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    // 交換 code 換取 session (寫入 cookie)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // 登入成功，轉跳到 next 指定的頁面 (這裡是 /project/[id]/join)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 如果失敗，轉回首頁或錯誤頁
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}