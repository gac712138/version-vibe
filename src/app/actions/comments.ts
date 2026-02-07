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

// ✅ 修改回傳型別
export interface GetCommentsResponse {
  data: CommentWithUser[];
  count: number;
}

export async function getComments(
  assetId: string, 
  projectId: string, 
  page: number = 1, 
  limit: number = 10
): Promise<GetCommentsResponse> { // ✅ 改回傳物件
  const supabase = await createClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 1. 抓取留言 (加上 count: 'exact' 來取得總數)
  const { data: comments, count, error } = await supabase
    .from("comments")
    .select("*", { count: "exact" }) // ✅ 取得總筆數
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Fetch comments error:", error);
    return { data: [], count: 0 };
  }

  if (!comments || comments.length === 0) {
    return { data: [], count: count || 0 };
  }

  // 2. 豐富化資料 (抓取作者資訊)
  const enrichedComments = await Promise.all(
    comments.map(async (c) => {
      let displayName = "未知成員";
      let avatarUrl = null;

      // 先查專案成員表 (優先顯示專案內暱稱)
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

      // 如果沒查到或名字是未知，查全域 Profile
      if (displayName === "未知成員") {
         const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", c.user_id)
            .maybeSingle();

         if (profile) {
            displayName = profile.display_name || "未知使用者";
            avatarUrl = profile.avatar_url;
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

  // ✅ 回傳結構改變
  return { 
    data: enrichedComments, 
    count: count || 0 
  }; 
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