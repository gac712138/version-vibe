import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// ✅ 這裡必須匯出名為 "middleware" 的函式
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 匹配所有路徑，除了靜態檔案、圖片等
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};