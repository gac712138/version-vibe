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

  if (error || !notifications) return [];

  // 2. 豐富化資料 (查詢發送者資訊)
  const enrichedNotifications = await Promise.all(
    notifications.map(async (n) => {
      let displayName = "未知成員";
      let avatarUrl: string | null = null;

      // 步驟 A: 先嘗試從「專案成員表」找 (這是優先顯示的暱稱)
      if (n.project_id && n.sender_id) {
        const { data: member } = await supabase
          .from("project_members")
          .select("display_name, avatar_url")
          .eq("user_id", n.sender_id)
          .eq("project_id", n.project_id) 
          .maybeSingle();

        if (member) {
          // 如果專案成員表有名字，就用它；否則保留未知，等下一步查全域
          if (member.display_name) displayName = member.display_name;
          // 專案成員表通常會同步頭像，如果有就用
          if (member.avatar_url) avatarUrl = member.avatar_url;
        }
      }

      // 步驟 B: 如果在專案表找不到 (例如已退出專案)，或資料缺漏，則查「全域 Profile」
      if (displayName === "未知成員" || !avatarUrl) {
         const { data: profile } = await supabase
           .from("profiles")
           .select("display_name, avatar_url")
           .eq("id", n.sender_id)
           .maybeSingle();
         
         if (profile) {
            // 只有當名字還是未知時，才用全域名稱覆蓋
            if (displayName === "未知成員") displayName = profile.display_name || "未知使用者";
            // 如果還沒有頭像，就用全域頭像
            if (!avatarUrl) avatarUrl = profile.avatar_url;
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

// ... markAsRead 與 markAllAsRead 維持不變
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