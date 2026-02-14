import { NextResponse } from "next/server";
// 確保這裡的路徑指向你專案中正確的 Supabase Server Client 建立函式
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // "next" 是登入後要跳轉的頁面，預設回 Dashboard
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    
    // 核心動作：交換 Code 換取 Session Cookie
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // 成功後，轉跳到指定頁面
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Supabase Auth Error:", error);
    }
  }

  // 失敗時，轉回登入頁並帶上錯誤訊息
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}