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

  // ✅ 新增：關聯查詢抓回來的 timestamp (用於跳轉播放器)
  comment?: {
    timestamp: number;
  };

  // 這是前端 UI 要顯示的最終資料 (豐富化後)
  sender?: {
    display_name: string;
    avatar_url?: string;
  };
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // 1. 抓取通知列表 + ✅ 關聯抓取 comment timestamp
  // 注意：這裡使用了 Supabase 的關聯語法 comment:comments(...)
  // 代表「抓取關聯的 comments 表，並取名為 comment，只拿 timestamp 欄位」
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

  if (error || !notifications || notifications.length === 0) {
    // 如果報錯 PGRST200，代表 comments 表還沒有建立 timestamp 欄位，請先去資料庫新增
    if (error) console.error("Fetch notifications error:", error);
    return [];
  }

  // 2. 豐富化資料 (查詢發送者資訊)
  // 這裡維持原本的邏輯，處理「專案暱稱 vs 全域暱稱」
  const enrichedNotifications = await Promise.all(
    notifications.map(async (n) => {
      let displayName = "未知成員";
      let avatarUrl: string | null = null;

      // --- 步驟 A: 先查全域 Profile ---
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
          .select("display_name")
          .eq("user_id", n.sender_id)
          .eq("project_id", n.project_id) 
          .maybeSingle();

        if (member && member.display_name) {
          displayName = member.display_name;
        }
      }

      // 將資料組合回傳，此時 n 裡面已經包含了 comment: { timestamp: ... }
      return {
        ...n,
        // 如果資料庫撈出來是 null (例如留言被刪了)，給個預設值
        // @ts-ignore: Supabase 生成的型別可能會與手寫的 Interface 有微小差異，這裡做個防呆
        comment: n.comment ? n.comment : { timestamp: 0 }, 
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