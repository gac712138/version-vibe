import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // 排除靜態檔案
  const isAsset = path.includes('.') || path.startsWith('/_next');

  // 1. 已登入且在登入頁 -> 導向 Dashboard
  if (user && (path === "/login" || path === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. 保護保護區：非公開路徑且無 User 時踢回登入
  const isPublicRoute = 
    path === "/login" || 
    path === "/" || 
    path.startsWith("/auth") || 
    path.startsWith("/api");

  if (!user && !isPublicRoute && !isAsset) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}