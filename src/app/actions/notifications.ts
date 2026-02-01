"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface NotificationItem {
  id: string;
  created_at: string;
  sender_id: string;
  project_id: string;
  comment_id: string;
  is_read: boolean;
  type: 'mention' | 'comment';
  content_preview: string;
  // 關聯資料 (透過 Supabase Join 撈取)
  sender?: { email: string };
  project?: { name: string };
}

// 1. 獲取通知列表
export async function getNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select(`
      *,
      sender:sender_id(email),
      project:project_id(name)
    `)
    .eq("receiver_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Fetch notifications error:", error);
    return [];
  }

  return data as unknown as NotificationItem[];
}

// 2. 標記單一通知為已讀
export async function markAsRead(notificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw error;
  
  // 這裡不一定要 revalidatePath，因為通常是在 Client 端更新 UI 狀態
}

// 3. (選用) 一鍵全部已讀
export async function markAllAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("receiver_id", user.id)
    .eq("is_read", false);
    
  revalidatePath("/");
}