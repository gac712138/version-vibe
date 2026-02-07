"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface CommentWithUser {
  id: string;
  content: string;
  timestamp: number;
  created_at: string;
  user_id: string;
  author: {
    display_name: string;
    avatar_url: string | null;
  };
}

// ✅ 修改：新增 page 與 limit 參數
export async function getComments(
  assetId: string, 
  projectId: string, 
  page: number = 1, 
  limit: number = 10
): Promise<CommentWithUser[]> {
  const supabase = await createClient();

  // 計算範圍 (例如第 1 頁是 0~9, 第 2 頁是 10~19)
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 1. 抓取留言本體 (加上 range 限制)
  const { data: comments, error } = await supabase
    .from("comments")
    .select("*")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false }) // 通常留言是新的在上面，或依需求改成 timestamp
    .range(from, to); // ✅ 關鍵：只抓取這一段

  if (error) {
    console.error("Fetch comments error:", error);
    return [];
  }

  if (!comments || comments.length === 0) return [];

  // 2. 豐富化資料 (這部分邏輯不變，但只會處理這 10 筆，效能更好)
  const enrichedComments = await Promise.all(
    comments.map(async (c) => {
      let displayName = "未知成員";
      let avatarUrl = null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", c.user_id)
        .maybeSingle();

      if (profile) {
        displayName = profile.display_name || "未知使用者";
        avatarUrl = profile.avatar_url;
      }

      if (projectId) {
        const { data: member } = await supabase
          .from("project_members")
          .select("display_name")
          .eq("user_id", c.user_id)
          .eq("project_id", projectId)
          .maybeSingle();

        if (member && member.display_name) {
          displayName = member.display_name;
        }
      }

      return {
        ...c,
        author: {
          display_name: displayName,
          avatar_url: avatarUrl,
        },
      };
    })
  );

  return enrichedComments;
}

/**
 * 新增留言
 */
export async function createComment(data: {
  content: string;
  timestamp: number;
  asset_id: string;
  project_id: string;
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
    })
    .select()
    .single();

  if (error) {
    console.error("Create Comment Error:", error);
    throw error;
  }

  // 2. 通知邏輯
  try {
    if (data.content.includes("@")) {
      const mentions = data.content.match(/@(\S+)/g);
      if (mentions) {
        // 查 track_id
        const { data: assetData } = await supabase
            .from("audio_assets")
            .select("track_id")
            .eq("id", data.asset_id)
            .single();

        // 查成員
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