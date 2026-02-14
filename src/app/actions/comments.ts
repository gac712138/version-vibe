"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface CommentWithUser {
  id: string;
  content: string;
  timestamp: number;
  created_at: string;
  user_id: string;
  parent_id?: string | null; 
  replyCount?: number;
  author: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface GetCommentsResponse {
  data: CommentWithUser[];
  count: number;
}

/**
 * 獲取留言列表
 */
export async function getComments(
  assetId: string, 
  projectId: string, 
  page: number = 1, 
  limit: number = 10
): Promise<GetCommentsResponse> {
  const supabase = await createClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 1. 抓取留言
  const { data: comments, count, error } = await supabase
    .from("comments")
    .select("*", { count: "exact" })
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !comments) {
    console.error("Fetch comments error:", error);
    return { data: [], count: 0 };
  }

  // 2. 豐富化資料 (抓取作者資訊)
  const enrichedComments = await Promise.all(
    comments.map(async (c) => {
      let displayName = "未知成員";
      let avatarUrl: string | null = null;

      if (projectId) {
        const { data: member } = await supabase
          .from("project_members")
          .select("display_name, avatar_url")
          .eq("user_id", c.user_id)
          .eq("project_id", projectId)
          .maybeSingle();

        if (member) {
          if (member.display_name) displayName = member.display_name;
          if (member.avatar_url) avatarUrl = member.avatar_url;
        }
      }

      if (displayName === "未知成員" || !avatarUrl) {
         const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", c.user_id)
            .maybeSingle();

         if (profile) {
            if (displayName === "未知成員") displayName = profile.display_name || "未知使用者";
            if (!avatarUrl) avatarUrl = profile.avatar_url;
         }
      }

      return {
        ...c,
        author: {
          display_name: displayName,
          avatar_url: avatarUrl,
        },
      } as CommentWithUser; 
    })
  );

  return { 
    data: enrichedComments, 
    count: count || 0 
  }; 
}

/**
 * 新增留言 (支援回覆 + @all + 通知去重)
 */
export async function createComment(data: {
  content: string;
  timestamp: number;
  asset_id: string;
  project_id: string;
  parent_id?: string; 
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. 寫入留言
  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      content: data.content,
      timestamp: data.timestamp,
      asset_id: data.asset_id,
      user_id: user.id,
      parent_id: data.parent_id || null, 
    })
    .select()
    .single();

  if (error) {
    console.error("Create Comment Error:", error);
    throw error;
  }

  // 2. 通知邏輯 (支援 @all 與去重)
  try {
    const content = data.content;

    // 只有當內容包含 @ 時才開始處理通知邏輯
    if (content.includes("@")) {
      
      // 平行抓取需要的資料：Asset資訊(為了track_id) 和 專案成員名單
      const [assetResult, membersResult] = await Promise.all([
        supabase.from("audio_assets").select("track_id").eq("id", data.asset_id).single(),
        supabase.from("project_members").select("user_id, display_name").eq("project_id", data.project_id)
      ]);

      const assetData = assetResult.data;
      const members = membersResult.data || [];

      if (members.length > 0) {
        // ✅ 使用 Set 來儲存目標 User ID，自動處理重複
        const targetUserIds = new Set<string>();

        // --- 邏輯 A: 處理 @all / @所有人 ---
        if (content.includes("@all") || content.includes("@所有人")) {
          members.forEach(member => {
            // 排除自己
            if (member.user_id !== user.id) {
              targetUserIds.add(member.user_id);
            }
          });
        }

        // --- 邏輯 B: 處理個別標註 ---
        const mentions = content.match(/@(\S+)/g);
        if (mentions) {
          for (const mention of mentions) {
            // 如果是 @all 前面已經處理過了，這裡跳過
            if (mention === "@all" || mention === "@所有人") continue;

            const rawName = mention.substring(1); // 去掉 @
            const nameToFind = rawName.replace(/[.,!?;:]$/, ""); // 去掉標點符號

            const targetMember = members.find(m => 
              m.display_name?.toLowerCase() === nameToFind.toLowerCase()
            );

            // 如果找到成員，且不是自己，加入 Set
            // (如果 @all 已經加過了，Set 會自動忽略這次加入)
            if (targetMember && targetMember.user_id !== user.id) {
              targetUserIds.add(targetMember.user_id);
            }
          }
        }

        // --- 邏輯 C: 批次寫入通知 ---
        if (targetUserIds.size > 0) {
          const notifications = Array.from(targetUserIds).map(receiverId => ({
            receiver_id: receiverId,
            sender_id: user.id,
            project_id: data.project_id,
            comment_id: comment.id,
            asset_id: data.asset_id,     
            track_id: assetData?.track_id,
            type: 'mention',
            content_preview: content.substring(0, 50),
            is_read: false,
            created_at: new Date().toISOString()
          }));

          await supabase.from("notifications").insert(notifications);
        }
      }
    }
  } catch (notificationError) {
    console.error("⚠️ Notification Error:", notificationError);
  }

  revalidatePath(`/project/${data.project_id}`);
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user.id);
  if (error) throw error;
}

export async function updateComment(commentId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { error } = await supabase.from("comments").update({ content }).eq("id", commentId).eq("user_id", user.id);
  if (error) throw error;
}