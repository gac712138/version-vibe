// utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // 🔴 關鍵 1：確保 Cookie 在開發環境下能正確寫入
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
      auth: {
        // 🔴 關鍵 2：強制開啟網址 Token 偵測與持久化
        detectSessionInUrl: true, 
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  )
}