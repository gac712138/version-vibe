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

  // 這是前端 UI 要顯示的最終資料
  sender?: {
    display_name: string;
    avatar_url?: string;
  };
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // 1. 抓取通知列表
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("receiver_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !notifications || notifications.length === 0) {
    return [];
  }

  // 2. 豐富化資料 (查詢發送者資訊)
  const enrichedNotifications = await Promise.all(
    notifications.map(async (n) => {
      let displayName = "未知成員";
      let avatarUrl: string | null = null;

      // --- 步驟 A: 先查全域 Profile (取得頭像 & 備用名稱) ---
      // 為什麼先查這個？因為頭像通常只有這裡有，而且這一步最不容易失敗
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", n.sender_id)
        .maybeSingle();

      if (profile) {
        displayName = profile.display_name || "未知使用者";
        avatarUrl = profile.avatar_url;
      }

      // --- 步驟 B: 嘗試覆蓋為「專案暱稱」 ---
      if (n.project_id && n.sender_id) {
        const { data: member } = await supabase
          .from("project_members")
          .select("display_name") // ✅ 只查 display_name，不要查 avatar_url (除非你確定表裡有這欄)
          .eq("user_id", n.sender_id)
          .eq("project_id", n.project_id) 
          .maybeSingle();

        // 如果在專案成員表裡有找到名字，就用這個名字覆蓋全域名稱
        if (member && member.display_name) {
          displayName = member.display_name;
        }
      }

      return {
        ...n,
        sender: {
          display_name: displayName,
          avatar_url: avatarUrl || "", 
        },
      };
    })
  );

  return enrichedNotifications;
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
}

export async function markAllAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("notifications").update({ is_read: true }).eq("receiver_id", user.id);
  }
}