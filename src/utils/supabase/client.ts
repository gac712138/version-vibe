import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // 這裡很單純，不需要 async，也不需要 cookies
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}