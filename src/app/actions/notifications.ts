"use server";

import { createClient } from "@/utils/supabase/server";

export interface NotificationItem {
  id: string;
  created_at: string;
  is_read: boolean;
  type: 'mention' | 'reply' | 'system';
  content_preview: string;
  project_id: string;
  comment_id?: string;
  sender_id: string;

  track_id?: string; 
  asset_id?: string;

  // 我們手動組裝這個物件
  sender?: {
    display_name: string;
    avatar_url?: string;
  };
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // ❌ 錯誤寫法 (會導致 PGRST200，請確保你沒有寫這一行)：
  // .select("*, sender:sender_id(email)") 
  
  // ✅ 正確寫法：只抓通知本體
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("receiver_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Fetch notifications error:", error);
    return [];
  }

  if (!notifications || notifications.length === 0) {
    return [];
  }

  // 2. "手動" 查詢發送者的暱稱 (避免關聯錯誤)
  const enrichedNotifications = await Promise.all(
    notifications.map(async (n) => {
      // 去 project_members 表找這個人的名字
      const { data: member } = await supabase
        .from("project_members")
        .select("display_name, avatar_url")
        .eq("user_id", n.sender_id)
        .eq("project_id", n.project_id) 
        .single();

      return {
        ...n,
        sender: {
          display_name: member?.display_name || "未知成員",
          avatar_url: member?.avatar_url,
        },
      };
    })
  );

  return enrichedNotifications;
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
}

export async function markAllAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("receiver_id", user.id);
  }
}