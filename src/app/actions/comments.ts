"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * 新增留言 (包含 @Mention 通知邏輯，並寫入完整追蹤資料)
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

  // 2. 通知邏輯 (Try-Catch 保護)
  try {
    if (data.content.includes("@")) {
      console.log("🔔 Detected '@', processing notifications...");
      
      const mentions = data.content.match(/@(\S+)/g);

      if (mentions) {
        // [新增步驟] 為了填寫 track_id，我們需要先查詢這個 asset 屬於哪個 track
        // 假設你的表名是 audio_assets，且裡面有 track_id 欄位
        const { data: assetData } = await supabase
            .from("audio_assets")
            .select("track_id")
            .eq("id", data.asset_id)
            .single();

        // 取得專案成員
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
              console.log(`✅ Notifying: ${targetMember.display_name}`);
              
              // [修正] 寫入完整的資料，包含 asset_id 和 track_id
              await supabase.from("notifications").insert({
                receiver_id: targetMember.user_id,
                sender_id: user.id,
                project_id: data.project_id,
                comment_id: comment.id,
                
                // 👇 這裡補上了！
                asset_id: data.asset_id,     
                track_id: assetData?.track_id, // 從資料庫查出來的 ID

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

  // 3. 更新快取
  revalidatePath(`/project/${data.project_id}`);
}

/**
 * 刪除留言
 */
export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) throw error;
}

/**
 * 編輯留言
 */
export async function updateComment(commentId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("comments")
    .update({ content })
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) throw error;
}