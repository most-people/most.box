import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// TypeScript 接口定义
interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface RequestBody {
  authData: TelegramAuthData;
}

// CORS配置
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL"),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  // 处理CORS预检请求
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { authData }: RequestBody = await req.json();

    // 验证Telegram数据
    const isValid: boolean = await verifyTelegramAuth(authData);
    if (!isValid) {
      const errorResponse = {
        error: "Invalid Telegram authentication",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // 创建Supabase管理员客户端
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const telegramId: string = authData.id.toString();
    const email: string = `${telegramId}@telegram.org`;

    // 检查用户是否已存在
    const { data: existingUser } = await supabase.auth.admin.listUsers({
      filter: `email.eq.${email}`,
      page: 1,
      perPage: 1,
    });

    let user: any = existingUser?.users?.[0];
    if (user?.id) {
      // 用户已存在，更新 metadata
      const { data: updatedUser, error: updateError } =
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            telegram_id: authData.id,
            first_name: authData.first_name,
            last_name: authData.last_name,
            username: authData.username,
            photo_url: authData.photo_url,
            provider: "telegram",
          },
        });

      if (updateError) {
        throw updateError;
      }
      user = updatedUser.user;
    } else {
      // 创建新用户
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: email,
          user_metadata: {
            telegram_id: authData.id,
            first_name: authData.first_name,
            last_name: authData.last_name,
            username: authData.username,
            photo_url: authData.photo_url,
            provider: "telegram",
          },
          email_confirm: true,
        });

      if (createError) {
        throw createError;
      }
      user = newUser.user;
    }

    // 生成登录链接
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
        options: {
          redirectTo: `${Deno.env.get("SITE_URL")}/auth/callback`,
        },
      });

    if (linkError) {
      throw linkError;
    }

    const successResponse = {
      success: true,
      user: user,
      redirect_url: linkData.properties?.action_link,
    };

    return new Response(JSON.stringify(successResponse), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Telegram auth error:", error);
    const errorResponse = {
      error: error.message,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});

// 验证Telegram认证数据
async function verifyTelegramAuth(
  authData: TelegramAuthData
): Promise<boolean> {
  const botToken: string | undefined = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    throw new Error("Telegram bot token not configured");
  }

  const { hash, ...dataToCheck } = authData;

  // 构建数据检查字符串
  const dataCheckString: string = Object.keys(dataToCheck)
    .sort()
    .map(
      (key: string) =>
        `${key}=${dataToCheck[key as keyof Omit<TelegramAuthData, "hash">]}`
    )
    .join("\n");

  // 生成密钥
  const secretKey: ArrayBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(botToken)
  );

  // 计算HMAC-SHA256
  const hmacKey: CryptoKey = await crypto.subtle.importKey(
    "raw",
    secretKey,
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature: ArrayBuffer = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    new TextEncoder().encode(dataCheckString)
  );

  const calculatedHash: string = Array.from(new Uint8Array(signature))
    .map((b: number) => b.toString(16).padStart(2, "0"))
    .join("");

  // 验证时间戳（防止重放攻击）
  const authTime: number = authData.auth_date * 1000;
  const now: number = Date.now();
  const maxAge: number = 24 * 60 * 60 * 1000; // 24小时有效期

  if (now - authTime > maxAge) {
    return false;
  }

  return calculatedHash === hash;
}
