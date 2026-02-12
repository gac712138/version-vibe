"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface CommentWithUser {
  id: string;
  content: string;
  timestamp: number;
  created_at: string;
  user_id: string;
  // ✅ 新增：支援回覆功能
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

  // 1. 抓取留言 (原本的 select("*") 就會包含 parent_id)
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
      } as CommentWithUser; // 強制轉型確保包含 parent_id
    })
  );

  return { 
    data: enrichedComments, 
    count: count || 0 
  }; 
}

/**
 * 新增留言 (支援回覆)
 */
export async function createComment(data: {
  content: string;
  timestamp: number;
  asset_id: string;
  project_id: string;
  // ✅ 新增：允許傳入父留言 ID
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
      // ✅ 關鍵修正：將 parent_id 寫入資料庫
      parent_id: data.parent_id || null, 
    })
    .select()
    .single();

  if (error) {
    console.error("Create Comment Error:", error);
    throw error;
  }

  // 2. 通知邏輯 (保持不變)
  try {
    if (data.content.includes("@")) {
      const mentions = data.content.match(/@(\S+)/g);
      if (mentions) {
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
          for (const mention of mentions) {
            const rawName = mention.substring(1); 
            const nameToFind = rawName.replace(/[.,!?;:]$/, ""); 

            const targetMember = members.find(m => 
              m.display_name?.toLowerCase() === nameToFind.toLowerCase()
            );

            if (targetMember && targetMember.user_id !== user.id) {
              await supabase.from("notifications").insert({
                receiver_id: targetMember.user_id,
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