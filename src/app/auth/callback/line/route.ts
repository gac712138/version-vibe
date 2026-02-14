import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  // 1. 強制讀取並驗證環境變數
  const clientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID;
  const clientSecret = process.env.LINE_CLIENT_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("❌ 嚴重錯誤: 環境變數缺失！請檢查 .env.local 是否包含：");
    console.error({ 
      clientId: !!clientId, 
      clientSecret: !!clientSecret, 
      supabaseUrl: !!supabaseUrl, 
      serviceRoleKey: !!serviceRoleKey 
    });
    return NextResponse.redirect(`${origin}/login?error=env_config_error`);
  }

  if (!code) return NextResponse.redirect(`${origin}/login?error=no_code`);

  try {
    const callbackUrl = `${origin}/auth/callback/line`; 

    // 2. 向 LINE 交換 Token
    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: callbackUrl,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("❌ LINE Token Error:", tokenData);
      throw new Error("LINE_TOKEN_EXCHANGE_FAILED");
    }

    // 3. 解析 ID Token
    const payloadPart = tokenData.id_token.split('.')[1];
    const decodedPayload = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf-8'));
    const { sub: lineUserId, email: lineEmail, name: lineName, picture: linePicture } = decodedPayload;

    // 4. 初始化 Supabase Admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 5. 帳號綁定與登入邏輯
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    if (profile?.email) {
      return await generateAutoLoginResponse(supabaseAdmin, profile.email, origin);
    }

    if (lineEmail) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users.find(u => u.email === lineEmail);

      if (existingUser) {
        await supabaseAdmin.from("profiles").update({ line_user_id: lineUserId }).eq("id", existingUser.id);
        return await generateAutoLoginResponse(supabaseAdmin, lineEmail, origin);
      } else {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: lineEmail,
          email_confirm: true,
          user_metadata: { full_name: lineName, avatar_url: linePicture, line_user_id: lineUserId }
        });
        if (createError) throw createError;
        if (newUser.user) {
          await supabaseAdmin.from("profiles").update({ line_user_id: lineUserId }).eq("id", newUser.user.id);
        }
        return await generateAutoLoginResponse(supabaseAdmin, lineEmail, origin);
      }
    }

    return NextResponse.redirect(`${origin}/login/link-account?lineId=${lineUserId}`);

  } catch (error) {
    console.error("❌ LINE Auth Crash:", error);
    return NextResponse.redirect(`${origin}/login?error=line_auth_failed`);
  }
}

async function generateAutoLoginResponse(supabaseAdmin: any, email: string, origin: string) {
  console.log(`正在為 ${email} 產生 Magic Link...`);
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: email,
    options: { 
      // 🔴 關鍵修改：先跳回 /login 而不是 /dashboard
      // 這樣前端才有機會解析網址列的 #access_token 並寫入 Cookie
      redirectTo: `${origin}/login` 
    }
  });

  if (error || !data.properties?.action_link) {
    throw new Error("無法產生登入連結");
  }

  // 跳轉到 Supabase 的驗證連結
  return NextResponse.redirect(data.properties.action_link);
}