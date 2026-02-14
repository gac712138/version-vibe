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
 * 新增留言 (支援回覆 + 通知去重)
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

  // 2. 通知邏輯 (已修正去重)
  try {
    if (data.content.includes("@")) {
      const mentions = data.content.match(/@(\S+)/g);
      
      if (mentions) {
        // 抓取相關資訊
        const { data: assetData } = await supabase
            .from("audio_assets")
            .select("track_id")
            .eq("id", data.asset_id)
            .single();

        const { data: members } = await supabase
          .from("project_members")
          .select("user_id, display_name")
          .eq("project_id", data.project_id);

        if (members && members.length > 0) {
          // ✅ 步驟 A: 建立一個 Set 來儲存「要發送通知的 User ID」
          // Set 會自動過濾重複的值
          const targetUserIds = new Set<string>();

          for (const mention of mentions) {
            const rawName = mention.substring(1); // 去掉 @
            const nameToFind = rawName.replace(/[.,!?;:]$/, ""); // 去掉標點

            const targetMember = members.find(m => 
              m.display_name?.toLowerCase() === nameToFind.toLowerCase()
            );

            // 如果找到了成員，且不是自己，就加入 Set
            if (targetMember && targetMember.user_id !== user.id) {
              targetUserIds.add(targetMember.user_id);
            }
          }

          // ✅ 步驟 B: 針對 Set 裡的每一個 ID 發送通知
          // 這裡跑的迴圈次數 = 實際被 Tag 的人數 (不包含重複)
          for (const receiverId of targetUserIds) {
            await supabase.from("notifications").insert({
              receiver_id: receiverId,
              sender_id: user.id,
              project_id: data.project_id,
              comment_id: comment.id,
              asset_id: data.asset_id,     
              track_id: assetData?.track_id,
              type: 'mention',
              content_preview: data.content.substring(0, 50),
              is_read: false
            });
          }
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