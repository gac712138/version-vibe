import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // ... (這裡放我們上一則回答中那個很長的邏輯代碼)
  // ... 包含 createServerClient 和那些 if (user) 的判斷
  
  // 為節省篇幅，若該檔案內容已正確則無需更動
  // 核心是：這個檔案匯出 updateSession，而 src/middleware.ts 匯出 middleware 並呼叫它
  
  // (以下是簡略版，請確保你保留了上一則回答的完整邏輯)
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (user && (path === "/" || path === "/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (!user && !path.startsWith("/login") && !path.startsWith("/auth") && !path.startsWith("/invite") && path !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}