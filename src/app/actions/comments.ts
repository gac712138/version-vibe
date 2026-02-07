"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// 定義回傳給前端的留言型別
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

/**
 * 取得特定 Asset 的所有留言 (包含作者資訊)
 */
export async function getComments(assetId: string, projectId: string): Promise<CommentWithUser[]> {
  const supabase = await createClient();

  // 1. 抓取留言本體
  const { data: comments, error } = await supabase
    .from("comments")
    .select("*")
    .eq("asset_id", assetId)
    .order("timestamp", { ascending: true });

  if (error) {
    console.error("Fetch comments error:", error);
    return [];
  }

  if (!comments) return [];

  // 2. 豐富化資料：分別查詢 Profile (頭像) 與 Project Member (暱稱)
  const enrichedComments = await Promise.all(
    comments.map(async (c) => {
      let displayName = "未知成員";
      let avatarUrl = null;

      // --- 步驟 A: 先查全域 Profile (取得頭像 & 全域名稱當備案) ---
      // 這是最穩的，通常頭像都在這裡
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", c.user_id)
        .maybeSingle();

      if (profile) {
        displayName = profile.display_name || "未知使用者";
        avatarUrl = profile.avatar_url;
      }

      // --- 步驟 B: 嘗試查詢「專案成員表」來覆蓋名稱 ---
      if (projectId) {
        const { data: member } = await supabase
          .from("project_members")
          .select("display_name") // ✅ 這裡只查 display_name，降低出錯機率
          .eq("user_id", c.user_id)
          .eq("project_id", projectId)
          .maybeSingle();

        // 如果該成員在這個專案有設定暱稱，就用它覆蓋全域名稱
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