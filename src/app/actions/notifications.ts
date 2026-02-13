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

  // 關聯查詢抓回來的 timestamp
  comment?: {
    timestamp: number;
  };

  sender?: {
    display_name: string;
    avatar_url?: string;
  };
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // 1. 抓取通知列表 + 關聯抓取 comment timestamp
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select(`
      *,
      comment:comments (
        timestamp
      )
    `)
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

  // 2. 豐富化資料
  const enrichedNotifications = await Promise.all(
    notifications.map(async (n) => {
      let displayName = "未知成員";
      let avatarUrl: string | null = null;

      // 步驟 A: 全域 Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", n.sender_id)
        .maybeSingle();

      if (profile) {
        displayName = profile.display_name || "未知使用者";
        avatarUrl = profile.avatar_url;
      }

      // 步驟 B: 專案成員暱稱覆蓋
      if (n.project_id && n.sender_id) {
        const { data: member } = await supabase
          .from("project_members")
          .select("display_name")
          .eq("user_id", n.sender_id)
          .eq("project_id", n.project_id) 
          .maybeSingle();

        if (member && member.display_name) {
          displayName = member.display_name;
        }
      }

      // ✅ 修正與強化：處理 Supabase 回傳可能為 Array 或 Object 的情況
      // @ts-ignore: 忽略 Supabase 自動型別的差異
      let commentData = n.comment;
      
      // 如果回傳是陣列 (例如 [{timestamp: 12}]), 取第一個; 如果是物件則直接用
      if (Array.isArray(commentData)) {
        commentData = commentData.length > 0 ? commentData[0] : null;
      }
      
      // 確保最終結構是 { timestamp: number }
      const finalComment = commentData ? { timestamp: commentData.timestamp } : { timestamp: 0 };

      return {
        ...n,
        comment: finalComment,
        sender: {
          display_name: displayName,
          avatar_url: avatarUrl || "", 
        },
      } as NotificationItem;
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