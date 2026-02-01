"use server";

import { createClient } from "@/utils/supabase/server";
import { v4 as uuidv4 } from "uuid";

export async function createInviteLink(projectId: string) {
  try {
    const supabase = await createClient();
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Unauthorized");

    // 這裡完全對齊你的 ERD 圖中 project_invites 表的欄位
    const { error: dbError } = await supabase.from("project_invites").insert({
      project_id: projectId,
      invited_by: userData.user.id, // 圖中欄位為 invited_by
      token: token,
      expires_at: expiresAt.toISOString(),
      status: 'pending', // 圖中有 status 欄位，給個預設值
    });

    if (dbError) {
      console.error("Database Insert Error:", dbError);
      throw new Error(dbError.message);
    }

    const getBaseUrl = () => {
      if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
      if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
      return "http://localhost:3000";
    };

    const baseUrl = getBaseUrl();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}/invite/${token}`;

  } catch (error) {
    console.error("Action Error (500):", error);
    throw error;
  }
}